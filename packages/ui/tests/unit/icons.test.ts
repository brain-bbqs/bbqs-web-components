import { describe, expect, it } from "vitest";
import { chevronIcon, moonIcon, resetIcon, signOutIcon, sunIcon } from "../../src/icons.js";

describe("icons", () => {
  it.each([
    ["moon", moonIcon, "theme-toggle-moon"],
    ["sun", sunIcon, "theme-toggle-sun"],
    ["sign-out", signOutIcon, "oauth-popover-signout-icon"],
  ] as const)(
    "%s is a stroked, currentColor, aria-hidden svg carrying the class the stylesheet keys on",
    (_name, make, cls) => {
      const svg = make();
      expect(svg.getAttribute("stroke")).toBe("currentColor");
      expect(svg.getAttribute("fill")).toBe("none");
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.classList.contains(cls)).toBe(true);
      expect(svg.childElementCount).toBeGreaterThan(0);
    },
  );

  it("takes a size", () => {
    expect(resetIcon(18).getAttribute("width")).toBe("18");
    expect(chevronIcon().getAttribute("height")).toBe("18");
    expect(sunIcon().querySelectorAll("line")).toHaveLength(8);
  });
});
