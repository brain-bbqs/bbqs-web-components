import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { CHROMATIC_PLACEHOLDER_VERSION, resolveAppVersion } from "../app-version.js";

function packageJsonWithVersion(version: string): URL {
  const dir = mkdtempSync(join(tmpdir(), "bbqs-config-"));
  const file = join(dir, "package.json");
  writeFileSync(file, JSON.stringify({ name: "x", version }));
  return pathToFileURL(file);
}

describe("resolveAppVersion", () => {
  it("reads the version out of the package.json it is pointed at", () => {
    expect(resolveAppVersion(packageJsonWithVersion("1.6.4"), {})).toBe("1.6.4");
  });

  it("accepts a plain path as well as a file URL", () => {
    const url = packageJsonWithVersion("2.0.0");
    expect(resolveAppVersion(url.pathname, {})).toBe("2.0.0");
  });

  it("pins the placeholder under Chromatic, so a version bump alone never re-snapshots a page", () => {
    expect(resolveAppVersion(packageJsonWithVersion("1.6.4"), { CHROMATIC_STATIC_VERSION: "true" })).toBe(
      CHROMATIC_PLACEHOLDER_VERSION,
    );
  });

  it("treats an empty CHROMATIC_STATIC_VERSION as unset", () => {
    expect(resolveAppVersion(packageJsonWithVersion("1.6.4"), { CHROMATIC_STATIC_VERSION: "" })).toBe("1.6.4");
  });
});
