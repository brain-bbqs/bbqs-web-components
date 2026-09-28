import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildChangelog,
  buildChangelogNodes,
  countChangelogVersions,
  isAllowedHref,
  parseChangelog,
  parseInline,
  renderChangelog,
} from "../../src/changelog.js";

const CHANGELOG = `# Changelog

## 0.0.3

#### 🚀 Enhancement

- Added \`thing\` ([#3](https://github.com/brain-bbqs/bbqs-uploader/pull/3))

## 0.0.2

#### 🐛 Bug Fix

- Fixed **something** ([#2](https://github.com/brain-bbqs/bbqs-uploader/pull/2))

## 0.0.1

#### 🏠 Internal

- Initial commit
`;

/** Rendered markup, for assertions on structure. The renderer itself never produces a string. */
function html(markdown: string, limit?: number): string {
  const holder = document.createElement("div");
  holder.append(buildChangelog(markdown, { limit }));
  return holder.innerHTML;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// The cases bbqs-uploader's and the web-app template's tests/unit/changelog.test.ts pinned for
// their innerHTML renderer, carried over unchanged in what they expect.
describe("buildChangelog, as the apps rendered it", () => {
  it("renders only the latest N version sections", () => {
    const out = html(CHANGELOG, 2);
    expect(out).toContain("0.0.3");
    expect(out).toContain("0.0.2");
    expect(out).not.toContain("0.0.1");
  });

  it('renders every version when the count is unbounded (the modal\'s "Show more")', () => {
    const out = html(CHANGELOG);
    expect(out).toContain("0.0.3");
    expect(out).toContain("0.0.2");
    expect(out).toContain("0.0.1");
  });

  it("renders subsection headings and list items", () => {
    const out = html(CHANGELOG, 1);
    expect(out).toContain("<h3>0.0.3</h3>");
    expect(out).toContain("<h4>🚀 Enhancement</h4>");
    expect(out).toContain("<li>");
  });

  it("renders inline code, bold, and links", () => {
    const out = html(CHANGELOG, 2);
    expect(out).toContain("<code>thing</code>");
    expect(out).toContain("<strong>something</strong>");
    expect(out).toContain(
      '<a href="https://github.com/brain-bbqs/bbqs-uploader/pull/3" target="_blank" rel="noopener">#3</a>',
    );
  });

  it("keeps markup in the source as text", () => {
    const out = html("## 0.0.1\n\n- <script>alert(1)</script>\n", 1);
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("renders plain paragraph lines outside of lists and headings", () => {
    expect(html("## 0.0.1\n\nJust a note, no list.\n", 1)).toContain("<p>Just a note, no list.</p>");
  });

  it("closes an open list before a following heading or paragraph", () => {
    const out = html("## 0.0.1\n\n- item one\n\n#### 🏠 Internal\n\n- item two\n\nsome trailing note\n", 1);
    expect(out).toContain("<li>item one</li></ul><h4>");
    expect(out).toContain("<li>item two</li></ul><p>some trailing note</p>");
  });

  it("handles a version heading with no body", () => {
    expect(html("## 0.0.1", 1)).toBe('<section class="changelog-version"><h3>0.0.1</h3></section>');
  });

  it("leaves non-http(s) link syntax unrendered as a link", () => {
    const out = html("## 0.0.1\n\n- see [local](../file.md)\n", 1);
    expect(out).not.toContain("<a ");
    expect(out).toContain("see [local](../file.md)");
  });

  it("keeps consecutive list items within a single <ul>", () => {
    expect(html("## 0.0.1\n\n- item one\n- item two\n", 1)).toContain("<ul><li>item one</li><li>item two</li></ul>");
  });
});

describe("countChangelogVersions", () => {
  it("counts the version sections", () => {
    expect(countChangelogVersions(CHANGELOG)).toBe(3);
  });

  it("returns 0 for a document with no version headings", () => {
    expect(countChangelogVersions("# Changelog\n\nnothing here yet\n")).toBe(0);
  });
});

describe("parseChangelog", () => {
  it("reads versions into headings, lists and paragraphs", () => {
    expect(parseChangelog("## 1.0.0\r\n\r\nNote.\r\n#### Fix\r\n- a\r\n  - b\r\n", { limit: 1 })).toEqual([
      {
        version: "1.0.0",
        blocks: [
          { kind: "paragraph", children: [{ kind: "text", text: "Note." }] },
          { kind: "heading", children: [{ kind: "text", text: "Fix" }] },
          // An indented item joins the same flat list, as it did in the apps.
          { kind: "list", items: [[{ kind: "text", text: "a" }], [{ kind: "text", text: "b" }]] },
        ],
      },
    ]);
  });

  it("shows a version heading as plain text, and takes only #### as a subsection", () => {
    const [version] = parseChangelog("## [1.0.0](https://x.test) **big**\n\n### Three\n##### Five\n");
    expect(version.version).toBe("[1.0.0](https://x.test) **big**");
    expect(version.blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph"]);
  });
});

describe("parseInline", () => {
  it("nests code and links inside bold and link text", () => {
    expect(parseInline("**see [the `x` flag](https://a.test)** now")).toEqual([
      {
        kind: "strong",
        children: [
          { kind: "text", text: "see " },
          {
            kind: "link",
            href: "https://a.test",
            children: [
              { kind: "text", text: "the " },
              { kind: "code", text: "x" },
              { kind: "text", text: " flag" },
            ],
          },
        ],
      },
      { kind: "text", text: " now" },
    ]);
  });

  it("keeps a code span's content literal", () => {
    expect(parseInline("`**[a](https://a.test)**`")).toEqual([{ kind: "code", text: "**[a](https://a.test)**" }]);
    expect(parseInline("`*.pyc`, `*.pyo`")).toEqual([
      { kind: "code", text: "*.pyc" },
      { kind: "text", text: ", " },
      { kind: "code", text: "*.pyo" },
    ]);
  });

  it("leaves unclosed or empty markers as text", () => {
    expect(parseInline("a `b")).toEqual([{ kind: "text", text: "a `b" }]);
    expect(parseInline("``")).toEqual([{ kind: "text", text: "``" }]);
    expect(parseInline("**b")).toEqual([{ kind: "text", text: "**b" }]);
    expect(parseInline("[b](")).toEqual([{ kind: "text", text: "[b](" }]);
  });
});

describe("security", () => {
  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.test/x",
    "/relative",
    "../file.md",
    "http://plain.test",
    "mailto:a@b.test",
  ])("does not link %j by default", (href) => {
    expect(isAllowedHref(href)).toBe(false);
    const out = html(`## 1\n\n- [x](${href})\n`);
    expect(out).not.toContain("<a");
  });

  it("links https, and only the protocols an app opts into", () => {
    expect(isAllowedHref("https://github.com/brain-bbqs")).toBe(true);
    expect(isAllowedHref("HTTPS://github.com")).toBe(true);
    expect(isAllowedHref("http://example.test", ["https:", "http:"])).toBe(true);
    expect(isAllowedHref("mailto:a@b.test", ["mailto:"])).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "vbscript:x", "blob:https://a.test/1", "file:///etc/passwd"])(
    "refuses %j even when an app lists its protocol",
    (href) => {
      expect(isAllowedHref(href, ["javascript:", "data:", "vbscript:", "blob:", "file:"])).toBe(false);
    },
  );

  it("draws markup-shaped source as text, creating no element it did not mean to", () => {
    const hostile =
      '## <img src=x onerror=alert(1)>\n\n#### <svg onload=alert(1)>\n\n- <iframe src="javascript:alert(1)"></iframe> `<b>` **<i>x</i>**\n\n<a href="javascript:alert(1)">click</a>\n';
    const holder = document.createElement("div");
    holder.append(buildChangelog(hostile));
    const tags = new Set(Array.from(holder.querySelectorAll("*"), (el) => el.tagName.toLowerCase()));
    expect([...tags].sort()).toEqual(["code", "h3", "h4", "li", "p", "section", "strong", "ul"]);
    expect(holder.querySelector("h3")?.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(holder.querySelector("code")?.textContent).toBe("<b>");
  });

  it("sets no attribute beyond a section's class and a link's href, target and rel", () => {
    const holder = document.createElement("div");
    holder.append(buildChangelog(CHANGELOG));
    const attrs = new Set(
      Array.from(holder.querySelectorAll("*")).flatMap((el) =>
        Array.from(el.attributes, (a) => `${el.tagName.toLowerCase()}[${a.name}]`),
      ),
    );
    expect([...attrs].sort()).toEqual(["a[href]", "a[rel]", "a[target]", "section[class]"]);
  });

  it("never parses markup: no innerHTML, outerHTML or insertAdjacentHTML", () => {
    const inner = vi.spyOn(Element.prototype, "innerHTML", "set");
    const outer = vi.spyOn(Element.prototype, "outerHTML", "set");
    const adjacent = vi.spyOn(Element.prototype, "insertAdjacentHTML");
    renderChangelog(document.createElement("div"), CHANGELOG);
    expect(inner).not.toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalled();
    expect(adjacent).not.toHaveBeenCalled();
  });

  it("checks an href again when drawing a tree built by hand, keeping the link's text", () => {
    const holder = document.createElement("div");
    holder.append(
      buildChangelogNodes([
        {
          version: "1",
          blocks: [
            {
              kind: "paragraph",
              children: [{ kind: "link", href: "javascript:alert(1)", children: [{ kind: "text", text: "click" }] }],
            },
          ],
        },
      ]),
    );
    expect(holder.innerHTML).toBe('<section class="changelog-version"><h3>1</h3><p>click</p></section>');
  });
});

describe("renderChangelog", () => {
  it("replaces what the target held", () => {
    const target = document.createElement("div");
    target.append(document.createElement("hr"));
    renderChangelog(target, CHANGELOG, { limit: 1 });
    expect(target.querySelectorAll("hr")).toHaveLength(0);
    expect(target.querySelectorAll(".changelog-version")).toHaveLength(1);
  });

  it("links an extra protocol an app opts into", () => {
    const target = document.createElement("div");
    renderChangelog(target, "## 1\n\n- [mail](mailto:a@b.test)\n", { linkProtocols: ["mailto:"] });
    expect(target.querySelector("a")?.getAttribute("href")).toBe("mailto:a@b.test");
  });
});
