import { afterEach, describe, expect, it, vi } from "vitest";
import { button, copyToClipboard, escapeHtml, h, svgEl, svgText, writeClipboard } from "../../src/dom.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("h / button", () => {
  it("builds an element with its class and text", () => {
    const el = h("p", "hint", "Ready");
    expect(el.tagName).toBe("P");
    expect(el.className).toBe("hint");
    expect(el.textContent).toBe("Ready");
  });

  it("stringifies a number and leaves class and text off when not given", () => {
    expect(h("span", null, 42).textContent).toBe("42");
    const bare = h("div");
    expect(bare.className).toBe("");
    expect(bare.textContent).toBe("");
  });

  it("sets text as text, never as markup", () => {
    expect(h("p", null, "<b>x</b>").innerHTML).toBe("&lt;b&gt;x&lt;/b&gt;");
  });

  it("makes every button type=button, so none submits a form by accident", () => {
    const b = button("primary", "Go");
    expect(b.type).toBe("button");
    expect(b.className).toBe("primary");
  });
});

describe("svgEl / svgText", () => {
  it("creates elements in the SVG namespace with their attributes", () => {
    const circle = svgEl("circle", { cx: 5, cy: 2.85, r: 0.85 });
    expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(circle.getAttribute("cx")).toBe("5");
    expect(svgEl("svg").attributes.length).toBe(0);
  });

  it("makes a text node with its class and content", () => {
    const t = svgText("label", { x: 1 }, "hi");
    expect(t.getAttribute("class")).toBe("label");
    expect(t.textContent).toBe("hi");
  });
});

describe("escapeHtml", () => {
  it("escapes the five characters that matter in markup", () => {
    expect(escapeHtml(`<a href="x">it's & done</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;it&#39;s &amp; done&lt;/a&gt;");
  });
});

describe("writeClipboard / copyToClipboard", () => {
  it("writes through the clipboard API and reports back", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const done = vi.fn();
    writeClipboard("ffmpeg -i in.mp4", done);
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("ffmpeg -i in.mp4");
    expect(done).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("falls back to a hidden textarea and execCommand where the API is refused", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: () => Promise.reject(new Error("denied")) } });
    const execCommand = vi.fn(() => true);
    (document as unknown as { execCommand: typeof execCommand }).execCommand = execCommand;
    const done = vi.fn();
    writeClipboard("text", done);
    await new Promise((r) => setTimeout(r, 0));
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(done).toHaveBeenCalled();
    expect(document.querySelector("textarea")).toBe(null);
    vi.unstubAllGlobals();
  });

  it("flashes Copied! on the button and puts its label back", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { clipboard: { writeText: () => Promise.resolve() } });
    const btn = button(null, "Copy");
    copyToClipboard("x", btn, 500);
    await vi.advanceTimersByTimeAsync(0);
    expect(btn.textContent).toBe("Copied!");
    await vi.advanceTimersByTimeAsync(500);
    expect(btn.textContent).toBe("Copy");
    vi.unstubAllGlobals();
  });
});
