import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildChangelog } from "../../src/changelog.js";
import { legacyRenderChangelogHtml } from "./fixtures/legacyChangelog.js";

// The apps adopt the package's renderer with no rendered change: on every construct their
// changelogs use (a sample drawn from all four is the fixture), the DOM it builds is the DOM the
// apps' innerHTML renderer produced. Checked when this landed against all four apps' full
// CHANGELOG.md files too, byte for byte.
const SAMPLE = readFileSync(resolve(import.meta.dirname, "fixtures/sample-changelog.md"), "utf8");

describe("the DOM renderer against the apps' innerHTML renderer", () => {
  it.each([1, 3, Infinity])("builds the same DOM for the latest %s versions", (limit) => {
    const legacy = document.createElement("div");
    legacy.innerHTML = legacyRenderChangelogHtml(SAMPLE, limit); // a repo-controlled fixture
    const built = document.createElement("div");
    built.append(buildChangelog(SAMPLE, { limit }));
    expect(built.innerHTML).toBe(legacy.innerHTML);
    expect(built.querySelectorAll("a").length).toBeGreaterThan(0);
  });
});
