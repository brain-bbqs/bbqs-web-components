// CHANGELOG.md rendered for the "What's New" modal. The changelog is repo-authored, but it is still
// Markdown turned into page content, so nothing here parses markup: the Markdown is read into a
// small tree of plain objects, and the tree is drawn with createElement and text nodes. The only
// elements drawn are section, h3, h4, ul, li, p, code, strong and a; the only attributes are the
// section's class and a link's href, target and rel, and an href is set only when it parses as an
// absolute URL on an allowed protocol (https: by default). Anything else stays visible as text.
//
// The subset is the one bbqs-uploader and the web-app template rendered, which is everything the
// apps' changelogs use: `## x.y.z` version headings (shown as plain text), `#### ` subsection
// headings, `- ` list items (indented ones join the same flat list), paragraphs, and inline code,
// **bold** and [text](https://...) links, which may nest inside bold and link text. A code span's
// content is literal.

/** A run of text inside a heading, list item or paragraph. */
export type ChangelogInline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; children: ChangelogInline[] }
  | { kind: "link"; href: string; children: ChangelogInline[] };

/** One line-level piece of a version's body. */
export type ChangelogBlock =
  | { kind: "heading"; children: ChangelogInline[] }
  | { kind: "list"; items: ChangelogInline[][] }
  | { kind: "paragraph"; children: ChangelogInline[] };

export interface ChangelogVersion {
  /** The heading's text, e.g. "1.3.8". */
  version: string;
  blocks: ChangelogBlock[];
}

export interface ChangelogOptions {
  /** How many of the latest versions to read (default all). */
  limit?: number;
  /** The protocols a link may point at (default `["https:"]`). `javascript:`, `data:`,
   * `vbscript:`, `blob:` and `file:` are refused even if listed. A link on any other protocol, or
   * one that is not an absolute URL, stays as its literal text. */
  linkProtocols?: readonly string[];
}

export const DEFAULT_LINK_PROTOCOLS: readonly string[] = ["https:"];
const NEVER_LINKED = new Set(["javascript:", "data:", "vbscript:", "blob:", "file:"]);

/**
 * Whether `href` may become a link: an absolute URL (the browser resolves an href with this same
 * parser, so what is checked is what would be followed) whose protocol is allowed.
 */
export function isAllowedHref(href: string, protocols: readonly string[] = DEFAULT_LINK_PROTOCOLS): boolean {
  let protocol: string;
  try {
    protocol = new URL(href).protocol;
  } catch {
    return false;
  }
  return protocols.includes(protocol) && !NEVER_LINKED.has(protocol);
}

const VERSION_HEADING = /^## /m;

/** How many `## ` version sections a CHANGELOG.md-style document has. */
export function countChangelogVersions(markdown: string): number {
  return markdown.split(VERSION_HEADING).length - 1;
}

/** Reads the latest `limit` versions of a CHANGELOG.md-style document into a tree. */
export function parseChangelog(markdown: string, options: ChangelogOptions = {}): ChangelogVersion[] {
  const { limit = Infinity, linkProtocols = DEFAULT_LINK_PROTOCOLS } = options;
  return markdown
    .split(VERSION_HEADING)
    .slice(1, limit + 1)
    .map((section) => {
      const newline = section.indexOf("\n");
      const version = (newline === -1 ? section : section.slice(0, newline)).trim();
      const body = newline === -1 ? "" : section.slice(newline + 1);
      return { version, blocks: parseBlocks(body, linkProtocols) };
    });
}

function parseBlocks(body: string, protocols: readonly string[]): ChangelogBlock[] {
  const blocks: ChangelogBlock[] = [];
  let list: ChangelogInline[][] | null = null;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("- ")) {
      if (!list) {
        list = [];
        blocks.push({ kind: "list", items: list });
      }
      list.push(parseInline(line.slice(2), protocols));
      continue;
    }
    list = null;
    if (line.startsWith("#### ")) blocks.push({ kind: "heading", children: parseInline(line.slice(5), protocols) });
    else blocks.push({ kind: "paragraph", children: parseInline(line, protocols) });
  }
  return blocks;
}

const LINK = /^\[([^\]]+)\]\(([^)]+)\)/;
const STRONG = /^\*\*([^*]+)\*\*/;

/** Reads inline code, bold and links out of one line, left to right. */
export function parseInline(text: string, protocols: readonly string[] = DEFAULT_LINK_PROTOCOLS): ChangelogInline[] {
  const out: ChangelogInline[] = [];
  let plain = "";
  const flush = (): void => {
    if (plain) out.push({ kind: "text", text: plain });
    plain = "";
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    if (rest.startsWith("`")) {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ kind: "code", text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    const link = LINK.exec(rest);
    if (link && isAllowedHref(link[2], protocols)) {
      flush();
      out.push({ kind: "link", href: link[2], children: parseInline(link[1], protocols) });
      i += link[0].length;
      continue;
    }
    const strong = STRONG.exec(rest);
    if (strong) {
      flush();
      out.push({ kind: "strong", children: parseInline(strong[1], protocols) });
      i += strong[0].length;
      continue;
    }
    plain += text[i];
    i += 1;
  }
  flush();
  return out;
}

/**
 * Draws parsed versions as DOM: a `section.changelog-version` per version holding an `<h3>` and
 * its blocks. `linkProtocols` is checked again here, so a tree built by hand cannot slip an href
 * past it either; a refused link keeps its text.
 */
export function buildChangelogNodes(
  versions: ChangelogVersion[],
  { linkProtocols = DEFAULT_LINK_PROTOCOLS }: Pick<ChangelogOptions, "linkProtocols"> = {},
  doc: Document = document,
): DocumentFragment {
  const inline = (parent: Node, nodes: ChangelogInline[]): void => {
    for (const node of nodes) {
      if (node.kind === "text") {
        parent.appendChild(doc.createTextNode(node.text));
      } else if (node.kind === "code") {
        const code = doc.createElement("code");
        code.textContent = node.text;
        parent.appendChild(code);
      } else if (node.kind === "strong") {
        const strong = doc.createElement("strong");
        inline(strong, node.children);
        parent.appendChild(strong);
      } else if (isAllowedHref(node.href, linkProtocols)) {
        const a = doc.createElement("a");
        a.setAttribute("href", node.href);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
        inline(a, node.children);
        parent.appendChild(a);
      } else {
        inline(parent, node.children);
      }
    }
  };
  const withInline = (tag: "h4" | "li" | "p", nodes: ChangelogInline[]): HTMLElement => {
    const el = doc.createElement(tag);
    inline(el, nodes);
    return el;
  };

  const fragment = doc.createDocumentFragment();
  for (const { version, blocks } of versions) {
    const section = doc.createElement("section");
    section.className = "changelog-version";
    const heading = doc.createElement("h3");
    heading.textContent = version;
    section.appendChild(heading);
    for (const block of blocks) {
      if (block.kind === "heading") {
        section.appendChild(withInline("h4", block.children));
      } else if (block.kind === "paragraph") {
        section.appendChild(withInline("p", block.children));
      } else {
        const ul = doc.createElement("ul");
        for (const item of block.items) ul.appendChild(withInline("li", item));
        section.appendChild(ul);
      }
    }
    fragment.appendChild(section);
  }
  return fragment;
}

/** Parses and draws the latest `limit` versions of `markdown`. */
export function buildChangelog(
  markdown: string,
  options: ChangelogOptions = {},
  doc: Document = document,
): DocumentFragment {
  return buildChangelogNodes(parseChangelog(markdown, options), options, doc);
}

/** Replaces `target`'s children with the latest `limit` versions of `markdown`. */
export function renderChangelog(target: Element, markdown: string, options: ChangelogOptions = {}): void {
  target.replaceChildren(buildChangelog(markdown, options, target.ownerDocument));
}
