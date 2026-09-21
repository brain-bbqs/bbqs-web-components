import { describe, expect, it } from "vitest";
import { renderVersion } from "../../src/version.js";

describe("renderVersion", () => {
  it("stamps the version with a v prefix", () => {
    const a = document.createElement("a");
    renderVersion(a, "1.6.4");
    expect(a.textContent).toBe("v1.6.4");
  });
});
