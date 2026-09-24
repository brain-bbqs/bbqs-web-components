import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bodyOf, mountHtml, readIndexHtml } from "../../src/vitest/html.js";

const PAGE =
  '<!doctype html><html><head><title>App</title></head><body class="x"><main id="app">hi</main></body></html>';

afterEach(() => {
  document.body.innerHTML = "";
});

describe("readIndexHtml", () => {
  it("reads the app's index.html from its root", () => {
    const dir = mkdtempSync(join(tmpdir(), "bbqs-index-"));
    writeFileSync(join(dir, "index.html"), PAGE);
    expect(readIndexHtml(dir)).toBe(PAGE);
    writeFileSync(join(dir, "other.html"), "<p>o</p>");
    expect(readIndexHtml(dir, "other.html")).toBe("<p>o</p>");
  });
});

describe("bodyOf", () => {
  it("returns what is inside <body>, and the whole string when there is no body", () => {
    expect(bodyOf(PAGE)).toBe('<main id="app">hi</main>');
    expect(bodyOf("<p>fragment</p>")).toBe("<p>fragment</p>");
  });

  it("drops every <script> when asked, for a harness that imports the entry module itself", () => {
    const page =
      '<html><head><script>1</script></head><body><main id="a">hi</main><script type="module" src="/x.js"></script></body></html>';
    expect(bodyOf(page, { stripScripts: true })).toBe('<main id="a">hi</main>');
    expect(bodyOf(page)).toContain("<script");
  });
});

describe("mountHtml", () => {
  it("mounts the page's body so getElementById finds its elements", () => {
    mountHtml(PAGE);
    expect(document.getElementById("app")?.textContent).toBe("hi");
    expect(document.querySelector("title")).toBe(null);
  });

  it("mounts a bare fragment too, and into another document when given one", () => {
    const other = document.implementation.createHTMLDocument("other");
    mountHtml("<p id='p'>x</p>", other);
    expect(other.getElementById("p")?.textContent).toBe("x");
    expect(document.getElementById("p")).toBe(null);
  });
});
