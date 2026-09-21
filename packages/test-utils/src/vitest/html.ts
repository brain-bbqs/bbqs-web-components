import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Mounting an app's real index.html in jsdom, so a test of `getElements()` fails when the page and
// the lookups drift apart rather than at startup in the browser.

/**
 * The app's index.html as text. Resolved from the vitest root (the app's repo) rather than
 * import.meta.url, which jsdom rewrites to an http: URL.
 */
export function readIndexHtml(rootDir: string = process.cwd(), file = "index.html"): string {
  return readFileSync(resolve(rootDir, file), "utf8");
}

/** The contents of a document's `<body>`, which is the skeleton the lookups are written against;
 * or the whole string when it carries no body element. */
export function bodyOf(html: string): string {
  return /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? html;
}

/**
 * Mounts repo-controlled static markup as the document body. Assigning static markup via
 * innerHTML is the pattern the apps' SECURITY.md documents as safe, and jsdom never executes
 * scripts inserted this way.
 */
export function mountHtml(html: string, doc: Document = document): void {
  doc.body.innerHTML = bodyOf(html);
}
