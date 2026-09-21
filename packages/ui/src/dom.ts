// Small DOM-building helpers, from encoding-helper's lib/dom.ts. Everything here builds elements
// and sets textContent; nothing parses markup, so a string read out of a file or an API can be
// handed to any of them.

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string | null,
  text?: string | number | null,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = String(text);
  return e;
}

/** A <button type="button">, which every button in the apps is, since none sits in a form. */
export function button(cls?: string | null, text?: string | number | null): HTMLButtonElement {
  const b = h("button", cls, text);
  b.type = "button";
  return b;
}

const SVG_NS = "http://www.w3.org/2000/svg";

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  }
  return el;
}

/** An SVG <text> node with its class, the rest of its attributes and its content in one call. */
export function svgText(cls: string, attrs: Record<string, string | number>, content: string): SVGTextElement {
  const el = svgEl("text", { class: cls, ...attrs });
  el.textContent = content;
  return el;
}

/** Escapes text so it can be embedded in author-authored markup. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Writes to the clipboard, falling back to a hidden textarea where the API is refused. */
export function writeClipboard(text: string, done: () => void): void {
  navigator.clipboard
    .writeText(text)
    .then(done)
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    });
}

/** Copies `text` and flashes "Copied!" on the button that asked for it. */
export function copyToClipboard(text: string, btn: HTMLButtonElement, revertAfterMs = 1400): void {
  writeClipboard(text, () => {
    const orig = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = orig;
    }, revertAfterMs);
  });
}
