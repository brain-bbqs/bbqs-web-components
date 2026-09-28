import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Guards on the stylesheets themselves, which no DOM test exercises: the promises ADOPTION.md
// makes to each app about what importing them can and cannot change.

const STYLES_DIR = resolve(import.meta.dirname, "../../styles");
const sheet = (name: string): string => readFileSync(resolve(STYLES_DIR, name), "utf8");
const sheets = readdirSync(STYLES_DIR).filter((f) => f.endsWith(".css"));
const withoutComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the first block opened by `selector`, sorted. */
function block(css: string, selector: string): string[] {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start + selector.length + 2, css.indexOf("}", start));
  return body
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .sort();
}

describe("tokens.css", () => {
  it("keeps its two dark blocks identical", () => {
    const css = withoutComments(sheet("tokens.css"));
    const media = block(css, ':root:not([data-theme="light"])');
    const explicit = block(css, ':root[data-theme="dark"]');
    expect(media.length).toBeGreaterThan(0);
    expect(media).toEqual(explicit);
  });
});

describe("every stylesheet", () => {
  it.each(sheets)("%s selects on classes only, never on an app's ids", (name) => {
    // Each rule's prelude: the text before a "{", back to the previous "{", "}" or ";".
    const preludes = Array.from(withoutComments(sheet(name)).matchAll(/([^{};]+)\{/g), (m) => m[1].trim());
    expect(preludes.filter((p) => /#[A-Za-z]/.test(p))).toEqual([]);
  });

  it.each(sheets)("%s gives every token tokens.css does not declare a fallback", (name) => {
    const declared = new Set(Array.from(sheet("tokens.css").matchAll(/^\s*(--[\w-]+):/gm), (m) => m[1]));
    const bare = Array.from(withoutComments(sheet(name)).matchAll(/var\((--[\w-]+)\)/g), (m) => m[1]);
    // encoding-helper imports shell.css alone, so it reads only tokens its own palette defines.
    expect(bare.filter((token) => !declared.has(token))).toEqual([]);
  });
});

describe("components.css", () => {
  it("imports every per-component stylesheet, so importing it still means all of them", () => {
    const imports = Array.from(sheet("components.css").matchAll(/@import "\.\/([\w-]+\.css)";/g), (m) => m[1]);
    expect(imports).toEqual(["controls.css", "dropzone.css", "dataset-picker.css", "human-subjects.css"]);
  });
});

describe("index.css", () => {
  it("imports every stylesheet, so importing it still means all of them", () => {
    const imports = Array.from(sheet("index.css").matchAll(/@import "\.\/([\w-]+\.css)";/g), (m) => m[1]);
    expect(imports).toEqual(["tokens.css", "base.css", "shell.css", "components.css", "whats-new.css"]);
  });
});

describe("whats-new.css", () => {
  it("reads only tokens encoding-helper's own palette defines, or carries a fallback", () => {
    const encodingHelperPalette = ["--card", "--text", "--muted", "--border", "--accent", "--accent-soft"];
    const bare = Array.from(withoutComments(sheet("whats-new.css")).matchAll(/var\((--[\w-]+)\)/g), (m) => m[1]);
    expect(bare.filter((t) => !encodingHelperPalette.includes(t))).toEqual([]);
    // The one knob, read with its fallback.
    expect(withoutComments(sheet("whats-new.css"))).toContain("var(--whats-new-code-bg, var(--accent-soft))");
  });

  it("hides Show more itself, for an app without base.css's [hidden] rule", () => {
    expect(block(withoutComments(sheet("whats-new.css")), ".whats-new-show-more[hidden]")).toEqual(["display: none"]);
  });
});

describe("shell.css", () => {
  it("keys the sign-in button on both its classes, so the red outranks button.primary", () => {
    const css = withoutComments(sheet("shell.css"));
    expect(css).toContain(".oauth-signin-btn.primary {");
    expect(css).toContain(".oauth-signin-btn.primary:hover:not(:disabled) {");
  });

  it("reads only tokens encoding-helper's own palette defines, or carries a fallback", () => {
    const encodingHelperPalette = ["--bg", "--card", "--text", "--muted", "--border", "--accent", "--accent-soft"];
    const bare = Array.from(withoutComments(sheet("shell.css")).matchAll(/var\((--[\w-]+)\)/g), (m) => m[1]);
    const accountOnly = ["--ember-red", "--ember-red-hover", "--shadow"];
    expect(bare.filter((t) => !encodingHelperPalette.includes(t) && !accountOnly.includes(t))).toEqual([]);
  });
});
