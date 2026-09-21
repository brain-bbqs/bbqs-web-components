import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Resolved from this file's own directory: import.meta.url is rewritten to a root-relative file
// URL for modules a jsdom test imports, but import.meta.dirname stays the real path.
const HTML_DIR = resolve(import.meta.dirname, "../../html");

/** One of the reference fragments under html/, as text. */
export function fragment(name: string): string {
  return readFileSync(resolve(HTML_DIR, `${name}.html`), "utf8");
}

/** Mounts a repo-controlled static fragment. jsdom never executes scripts inserted this way, and
 * the fragments hold none. */
export function mount(html: string): void {
  document.body.innerHTML = html;
}
