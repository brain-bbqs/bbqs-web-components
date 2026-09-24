// Path and file-name sanitization for archive asset paths, so every tool derives the same asset
// path from the same file name.

/** Strips the combining marks NFKD decomposition leaves behind, so "café" folds to "cafe" rather
 * than losing the character outright. */
export function foldDiacritics(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export interface SanitizeSegmentOptions {
  /**
   * What a run of whitespace becomes. bbqs-uploader folds it into the same `_` as any other illegal
   * character; clip-extractor uses `+`, keeping word boundaries legible in a name that cannot hold
   * spaces. Must itself be a character the segment may hold (see `extraAllowed`).
   */
  whitespaceAs?: "_" | "+";
  /**
   * Characters allowed through on top of `[A-Za-z0-9._-]`, as the inside of a character class.
   * clip-extractor passes `"+"`: it generates `+` itself, in the BIDS-style `range-<in>+<out>`
   * entity of an extracted snippet's name, and replacing it would corrupt that entity.
   */
  extraAllowed?: string;
}

/** Reduces one path segment to `[A-Za-z0-9._-]` (plus `extraAllowed`), collapsing runs and trimming
 * punctuation from both ends. `fallback` stands in when nothing usable is left. */
export function sanitizeSegment(segment: string, fallback: string, options: SanitizeSegmentOptions = {}): string {
  const { whitespaceAs = "_", extraAllowed = "" } = options;
  const allowed = `A-Za-z0-9._${extraAllowed}-`;
  const punctuation = `._+-`;
  let s = foldDiacritics(segment);
  s = s.replace(/\s+/g, whitespaceAs);
  s = s.replace(new RegExp(`[^${allowed}]+`, "g"), "_");
  s = s
    .replace(/_{2,}/g, "_")
    .replace(/\+{2,}/g, "+")
    .replace(new RegExp(`^[${punctuation}]+|[${punctuation}]+$`, "g"), "");
  return s || fallback;
}

/** Sanitizes a file name's base with {@link sanitizeSegment} ("file" when nothing survives) and
 * keeps its extension, lowercased. A dot at index 0 is a dotfile, not an extension. */
export function sanitizeFilename(originalName: string, options?: SanitizeSegmentOptions): string {
  const dot = originalName.lastIndexOf(".");
  const hasExt = dot > 0;
  const base = hasExt ? originalName.slice(0, dot) : originalName;
  const ext = hasExt ? originalName.slice(dot).toLowerCase() : "";
  return `${sanitizeSegment(base, "file", options)}${ext}`;
}

/** Joins the sanitized segments of `prefix` (dropping empty, `.` and `..` ones) with `filename`. */
export function sanitizePath(prefix: string, filename: string, options?: SanitizeSegmentOptions): string {
  const segments = prefix
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s && s !== "." && s !== "..")
    .map((s) => sanitizeSegment(s, "_", options));
  return [...segments, filename].join("/");
}

/**
 * Keeps a file name as it arrived, punctuation, parentheses and case all intact, removing only
 * spaces plus whatever could escape the directory or break the path (separators, control
 * characters, leading dots). For an original that is uploaded untouched otherwise.
 */
export function verbatimFilename(originalName: string, fallback = "original"): string {
  const flattened = originalName
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, "")
    .replace(/\s+/g, "")
    .replace(/[/\\]+/g, "_")
    .replace(/^\.+/, "");
  return flattened || fallback;
}
