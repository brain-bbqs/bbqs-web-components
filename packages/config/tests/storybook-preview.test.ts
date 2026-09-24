// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { storybookPreview } from "../storybook-preview.js";

describe("storybookPreview decorator", () => {
  it("pins data-theme from the toolbar global before building the story", () => {
    const [decorate] = storybookPreview.decorators;
    const el = document.createElement("div");
    expect(decorate(() => el, { globals: { theme: "dark" } })).toBe(el);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("falls back to light when the global is unset", () => {
    const [decorate] = storybookPreview.decorators;
    decorate(() => document.createElement("div"), { globals: {} });
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
