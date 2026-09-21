// @vitest-environment node
// Blob.slice().arrayBuffer(), how hashPart streams a file, is unimplemented in jsdom, so these run
// against node's own Blob instead of this suite's default DOM environment.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InterruptedError } from "@brain-bbqs/utils";
import { combineDigests, computeDandiEtag, computeMd5, hashPart, planParts } from "../../src/etag.js";
import type { FilePart } from "../../src/types.js";

const MB = 2 ** 20;

function filled(size: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(size));
  for (let i = 0; i < size; i++) bytes[i] = i % 251;
  return bytes;
}

/** The dandi-etag as defined by dandischema: MD5 of the concatenated per-part MD5s, suffixed with
 * the part count. Computed here with node's crypto so the test is independent of spark-md5. */
function referenceEtag(bytes: Uint8Array, parts: FilePart[]): string {
  const inner = Buffer.concat(
    parts.map((p) =>
      createHash("md5")
        .update(bytes.subarray(p.offset, p.offset + p.size))
        .digest(),
    ),
  );
  return `${createHash("md5").update(inner).digest("hex")}-${parts.length}`;
}

describe("planParts", () => {
  it("plans a single part sized to the whole file when it fits in one default part", () => {
    expect(planParts(1024)).toEqual([{ number: 1, offset: 0, size: 1024 }]);
    expect(planParts(10 * MB)).toEqual([{ number: 1, offset: 0, size: 10 * MB }]);
  });

  it("splits at the 64MB default part size, leaving the remainder last", () => {
    expect(planParts(64 * MB + 10)).toEqual([
      { number: 1, offset: 0, size: 64 * MB },
      { number: 2, offset: 64 * MB, size: 10 },
    ]);
  });

  it("covers the whole file exactly, with no gaps or overlap", () => {
    const size = 200 * MB + 7;
    const parts = planParts(size);
    expect(parts.reduce((sum, p) => sum + p.size, 0)).toBe(size);
    parts.forEach((p, i) => expect(p.offset).toBe(i === 0 ? 0 : parts[i - 1].offset + parts[i - 1].size));
  });

  it("grows the part size past the 64 MB default once 10,000 parts would not cover the file", () => {
    const size = 2 ** 40; // 1 TB: 16,384 default-sized parts, so the part size must be recomputed
    const parts = planParts(size);
    expect(parts).toHaveLength(10_000);
    expect(parts[0].size).toBeGreaterThan(64 * MB);
    expect(parts[parts.length - 1].offset + parts[parts.length - 1].size).toBe(size);
  });

  it("rejects an empty file, which the archive cannot store", () => {
    expect(() => planParts(0)).toThrow(/empty files/i);
  });

  it("keeps the whole part count when the file divides into parts exactly", () => {
    const parts = planParts(128 * MB);
    expect(parts).toHaveLength(2);
    expect(parts[1]).toEqual({ number: 2, offset: 64 * MB, size: 64 * MB });
  });

  it("rejects files larger than 5 TB", () => {
    expect(() => planParts(5 * 2 ** 40 + 1)).toThrow(/larger than the S3 maximum/i);
  });
});

describe("computeDandiEtag", () => {
  it("matches the reference dandi-etag for a single-part blob", async () => {
    const bytes = filled(4096);
    const parts = planParts(bytes.length);
    expect(await computeDandiEtag(new Blob([bytes]), parts)).toBe(referenceEtag(bytes, parts));
  });

  it("matches the reference dandi-etag across a multi-part layout", async () => {
    const bytes = filled(3000);
    const parts: FilePart[] = [
      { number: 1, offset: 0, size: 1000 },
      { number: 2, offset: 1000, size: 1000 },
      { number: 3, offset: 2000, size: 1000 },
    ];
    expect(await computeDandiEtag(new Blob([bytes]), parts)).toBe(referenceEtag(bytes, parts));
  });

  it("matches the reference when a part spans several 16MB hash chunks", async () => {
    const bytes = filled(17 * MB);
    const parts = planParts(bytes.length);
    expect(parts).toHaveLength(1);
    expect(await computeDandiEtag(new Blob([bytes]), parts)).toBe(referenceEtag(bytes, parts));
  });

  it("reports monotonic progress ending at 1", async () => {
    const seen: number[] = [];
    await computeDandiEtag(new Blob([filled(2048)]), planParts(2048), (f) => seen.push(f));
    expect(seen.at(-1)).toBe(1);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  it("reports progress as done when handed no parts", async () => {
    const seen: number[] = [];
    await computeDandiEtag(new Blob([]), [], (f) => seen.push(f));
    expect(seen).toEqual([1]);
  });
});

describe("hashPart / combineDigests", () => {
  it("returns a 16-byte digest and reports cumulative bytes per chunk", async () => {
    const size = 2 * MB;
    const file = new Blob([filled(size)]);
    const [part] = planParts(size);
    const chunkBytes: number[] = [];
    const digest = await hashPart(file, part, (b) => chunkBytes.push(b));
    expect(digest).toBeInstanceOf(Uint8Array);
    expect(digest.length).toBe(16);
    expect(chunkBytes[chunkBytes.length - 1]).toBe(size);
  });

  it("lets parts be hashed independently and out of order, as a worker pool does", async () => {
    const bytes = filled(3000);
    const parts: FilePart[] = [
      { number: 1, offset: 0, size: 1000 },
      { number: 2, offset: 1000, size: 1000 },
      { number: 3, offset: 2000, size: 1000 },
    ];
    const file = new Blob([bytes]);
    const partDigests = new Uint8Array(parts.length * 16);
    for (const part of [...parts].reverse()) {
      partDigests.set(await hashPart(file, part), (part.number - 1) * 16);
    }
    expect(combineDigests(partDigests, parts.length)).toBe(referenceEtag(bytes, parts));
  });

  it("suffixes the digest with the part count", () => {
    expect(combineDigests(new Uint8Array(32), 2).endsWith("-2")).toBe(true);
  });

  it("refuses a file that changed underneath the hash", async () => {
    const file = new Blob([filled(1000)]);
    await expect(hashPart(file, { number: 1, offset: 0, size: 2000 })).rejects.toThrow(/changed on disk/);
  });
});

describe("computeMd5", () => {
  const reference = (bytes: Uint8Array) => createHash("md5").update(bytes).digest("hex");

  it("matches node's own digest for a blob smaller than one chunk", async () => {
    const bytes = filled(2048);
    expect(await computeMd5(new Blob([bytes]))).toBe(reference(bytes));
  });

  it("matches it across the chunk boundary too, where the streaming loop actually runs", async () => {
    const bytes = filled(20 * MB);
    expect(await computeMd5(new Blob([bytes]))).toBe(reference(bytes));
  });

  it("matches it for an empty blob, which the loop never enters for, and still reports progress", async () => {
    const seen: number[] = [];
    expect(await computeMd5(new Blob([]), (f) => seen.push(f))).toBe(reference(new Uint8Array(0)));
    expect(seen).toEqual([1]);
  });
});

describe("stopping a hash partway through", () => {
  it("gives up at the next chunk boundary once stopped", async () => {
    const controller = new AbortController();
    const seen: number[] = [];
    await expect(
      computeMd5(
        new Blob([filled(40 * MB)]),
        (f) => {
          seen.push(f);
          controller.abort();
        },
        controller.signal,
      ),
    ).rejects.toThrow(InterruptedError);
    // One chunk's worth of progress, and then nothing: the remaining 24MB were never read.
    expect(seen).toHaveLength(1);
  });

  it("reads no bytes at all when already stopped", async () => {
    const controller = new AbortController();
    controller.abort();
    const bytes = new Blob([filled(2048)]);
    await expect(computeMd5(bytes, undefined, controller.signal)).rejects.toThrow(InterruptedError);
    await expect(computeDandiEtag(bytes, planParts(2048), undefined, controller.signal)).rejects.toThrow(
      InterruptedError,
    );
  });
});
