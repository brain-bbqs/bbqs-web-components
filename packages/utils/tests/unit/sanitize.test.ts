import { describe, expect, it } from "vitest";
import {
  foldDiacritics,
  sanitizeFilename,
  sanitizePath,
  sanitizeSegment,
  verbatimFilename,
} from "../../src/sanitize.js";

describe("foldDiacritics", () => {
  it("drops combining marks and keeps the base letters", () => {
    expect(foldDiacritics("café résumé")).toBe("cafe resume");
  });
});

// bbqs-uploader's defaults.
describe("sanitizeSegment", () => {
  it("strips accents and replaces unsafe characters", () => {
    expect(sanitizeSegment("café résumé!", "fallback")).toBe("cafe_resume");
  });

  it("collapses repeated underscores and trims edges", () => {
    expect(sanitizeSegment("  __weird--name__  ", "fallback")).toBe("weird--name");
  });

  it("falls back when nothing survives sanitization", () => {
    expect(sanitizeSegment("!!!", "fallback")).toBe("fallback");
    expect(sanitizeSegment("///", "fallback")).toBe("fallback");
  });

  it("treats + as illegal by default", () => {
    expect(sanitizeSegment("a+b", "x")).toBe("a_b");
  });
});

// clip-extractor's variant: whitespace to `+`, and `+` itself kept.
describe("sanitizeSegment with clip-extractor's options", () => {
  const options = { whitespaceAs: "+", extraAllowed: "+" } as const;

  it("turns whitespace into + and other disallowed characters into underscores", () => {
    expect(sanitizeSegment("mice cam 2 (final)", "x", options)).toBe("mice+cam+2+_final");
  });

  it("keeps a + the app generated itself, such as a range entity", () => {
    expect(sanitizeSegment("name-mice_range-0+30_type-snippet", "x", options)).toBe(
      "name-mice_range-0+30_type-snippet",
    );
  });

  it("collapses runs of + and trims them from the ends", () => {
    expect(sanitizeSegment("++a   b++", "x", options)).toBe("a+b");
  });

  it("strips accents rather than replacing them", () => {
    expect(sanitizeSegment("café", "x", options)).toBe("cafe");
  });
});

describe("sanitizeFilename", () => {
  it("sanitizes the base name and preserves the original extension", () => {
    expect(sanitizeFilename("My Video.mov")).toBe("My_Video.mov");
  });

  it("lowercases the extension", () => {
    expect(sanitizeFilename("Clip.MP4")).toBe("Clip.mp4");
  });

  it("handles filenames with no extension", () => {
    expect(sanitizeFilename("README")).toBe("README");
  });

  it("falls back when nothing survives sanitization", () => {
    expect(sanitizeFilename("!!!.mov")).toBe("file.mov");
  });

  it("treats a leading dot as a dotfile, not an extension", () => {
    expect(sanitizeFilename(".gitignore")).toBe("gitignore");
  });

  it("passes segment options through", () => {
    expect(sanitizeFilename("my clip.mp4", { whitespaceAs: "+", extraAllowed: "+" })).toBe("my+clip.mp4");
  });
});

describe("sanitizePath", () => {
  it("joins sanitized prefix segments with the filename", () => {
    expect(sanitizePath("session 1/../sub01", "clip.mp4")).toBe("session_1/sub01/clip.mp4");
  });

  it("drops empty, '.' and '..' segments", () => {
    expect(sanitizePath("//./..//videos//", "clip.mp4")).toBe("videos/clip.mp4");
  });

  it("returns just the filename for an empty prefix", () => {
    expect(sanitizePath("", "clip.mp4")).toBe("clip.mp4");
  });
});

describe("verbatimFilename", () => {
  it("leaves an ordinary name completely alone, case and punctuation included", () => {
    expect(verbatimFilename("file_example_480-Copy.WebM")).toBe("file_example_480-Copy.WebM");
  });

  it("removes spaces without substituting anything for them", () => {
    expect(verbatimFilename("file_example_480 - Copy.webm")).toBe("file_example_480-Copy.webm");
  });

  it("flattens path separators so a name cannot escape its directory", () => {
    const flat = verbatimFilename("../../etc/passwd");
    expect(flat).toBe("_.._etc_passwd");
    expect(/[/\\]/.test(flat)).toBe(false);
  });

  it("drops control characters", () => {
    expect(verbatimFilename("a\u0000b\u001fc.mp4")).toBe("abc.mp4");
  });

  it("falls back when nothing is left", () => {
    expect(verbatimFilename("   ", "original")).toBe("original");
    expect(verbatimFilename("   ")).toBe("original");
  });
});
