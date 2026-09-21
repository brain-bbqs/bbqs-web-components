import SparkMD5 from "spark-md5";
import { throwIfInterrupted } from "@brain-bbqs/utils";
import type { FilePart } from "./types.js";

// DANDI addresses blobs by a "dandi-etag": the S3 multipart ETag (an MD5 of the concatenated
// per-part MD5s, suffixed with the part count), so the part layout used to hash a file must match
// the one the server plans for its upload.

const MB = 2 ** 20;
const GB = 2 ** 30;
const TB = 2 ** 40;
const MAX_PARTS = 10_000;
const MIN_PART_SIZE = 5 * MB;
const MAX_PART_SIZE = 5 * GB;
const DEFAULT_PART_SIZE = 64 * MB;
const HASH_CHUNK = 16 * MB;

/** Faithful port of dandischema.digests.dandietag.PartGenerator. */
export function planParts(fileSize: number): FilePart[] {
  if (fileSize <= 0) throw new Error("Empty files cannot be uploaded to EMBER.");
  if (fileSize > 5 * TB) throw new Error("File is larger than the S3 maximum object size (5 TB).");

  let partSize = DEFAULT_PART_SIZE;
  if (Math.ceil(fileSize / partSize) >= MAX_PARTS) {
    partSize = Math.ceil(fileSize / MAX_PARTS);
  }
  // Unreachable for any size the two guards above let through (the part size lands between 64 MB
  // and about 537 MB), kept as the reference implementation keeps it.
  /* v8 ignore if -- defensive */
  if (partSize < MIN_PART_SIZE || partSize > MAX_PART_SIZE) {
    throw new Error("Internal error: computed part size is outside S3 limits.");
  }

  let partQty = Math.floor(fileSize / partSize);
  let finalPartSize = fileSize - partQty * partSize;
  if (finalPartSize === 0) {
    finalPartSize = partSize;
  } else {
    partQty += 1;
  }
  if (partQty === 1) partSize = finalPartSize;

  const parts: FilePart[] = [];
  let offset = 0;
  for (let number = 1; number <= partQty; number++) {
    const size = number === partQty ? finalPartSize : partSize;
    parts.push({ number, offset, size });
    offset += size;
  }
  return parts;
}

/** Reads `length` bytes of `blob` from `offset` in HASH_CHUNK-sized pieces, handing each to `take`
 * along with the running total read so far, so a multi-gigabyte source never lands in memory whole.
 *
 * A short read means the file changed underneath the hash: a browser hands out a `File` as a live
 * handle on something the visitor can still edit or unmount, and a digest folded from part-old,
 * part-new bytes would name a blob that never existed.
 *
 * `signal` is read at every chunk boundary: hashing a multi-gigabyte source is the longest
 * uninterruptible stretch an upload has, and a chunk is 16MB of it. */
async function eachChunk(
  blob: Blob,
  offset: number,
  length: number,
  take: (buf: ArrayBuffer, readSoFar: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  let read = 0;
  while (read < length) {
    throwIfInterrupted(signal);
    const n = Math.min(HASH_CHUNK, length - read);
    const start = offset + read;
    const buf = await blob.slice(start, start + n).arrayBuffer();
    if (buf.byteLength !== n) {
      throw new Error("The file changed on disk while hashing; please re-add it.");
    }
    read += n;
    take(buf, read);
  }
}

/**
 * MD5 of one part of a blob, streamed in 16MB chunks. Parts are independent of each other, so
 * callers may hash any subset of a file's parts concurrently (bbqs-uploader's worker pool does) and
 * stitch the results together with {@link combineDigests}.
 */
export async function hashPart(
  blob: Blob,
  part: FilePart,
  onChunk: (bytesDoneInPart: number) => void = () => {},
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const spark = new SparkMD5.ArrayBuffer();
  await eachChunk(
    blob,
    part.offset,
    part.size,
    (buf, read) => {
      spark.append(buf);
      onChunk(read);
    },
    signal,
  );
  // end(true) yields the raw 16-byte digest as a binary string
  const raw = spark.end(true);
  const digest = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    digest[i] = raw.charCodeAt(i) & 0xff;
  }
  return digest;
}

/** Folds the concatenated per-part digests (16 bytes per part, in part order) into the final etag. */
export function combineDigests(partDigests: Uint8Array, partCount: number): string {
  const finalSpark = new SparkMD5.ArrayBuffer();
  finalSpark.append(partDigests.buffer as ArrayBuffer);
  return `${finalSpark.end()}-${partCount}`;
}

/** Hashes every part of `blob` in order and returns its dandi-etag, reporting 0..1 progress. */
export async function computeDandiEtag(
  blob: Blob,
  parts: FilePart[],
  onProgress: (fraction: number) => void = () => {},
  signal?: AbortSignal,
): Promise<string> {
  const total = parts.reduce((sum, p) => sum + p.size, 0);
  const digests = new Uint8Array(parts.length * 16);
  let done = 0;
  for (const part of parts) {
    digests.set(
      // `take` only runs after a non-empty read, so `total` is never zero here.
      await hashPart(blob, part, (n) => onProgress((done + n) / total), signal),
      (part.number - 1) * 16,
    );
    done += part.size;
  }
  onProgress(1);
  return combineDigests(digests, parts.length);
}

/** Plain whole-file MD5, independent of the dandi-etag above, which even for a single-part blob is
 * `md5(md5(file))` rather than `md5(file)`. Only the dandi-etag identifies the blob to the archive,
 * but a plain MD5 is what most tooling outside it expects. Streamed in the same HASH_CHUNK-sized
 * reads as `hashPart`; a separate pass over the bytes rather than folded into `computeDandiEtag`'s,
 * since that one resets its digest at every part boundary and this one must not. */
export async function computeMd5(
  blob: Blob,
  onProgress: (fraction: number) => void = () => {},
  signal?: AbortSignal,
): Promise<string> {
  const spark = new SparkMD5.ArrayBuffer();
  await eachChunk(
    blob,
    0,
    blob.size,
    (buf, read) => {
      spark.append(buf);
      onProgress(read / blob.size);
    },
    signal,
  );
  onProgress(1);
  return spark.end();
}
