import { describe, expect, it, vi } from "vitest";
import { VIEWPORTS } from "../../src/playwright/layout.js";
import { forEachViewport, type ViewportTestRegistrar } from "../../src/playwright/viewports.js";

describe("forEachViewport", () => {
  it("registers one test per viewport, with the viewport's name in the title", () => {
    const registered: string[] = [];
    const test: ViewportTestRegistrar = (title) => {
      registered.push(title);
    };
    forEachViewport(test, "Main page - default", () => Promise.resolve());
    expect(registered).toEqual([
      "Main page - default [desktop]",
      "Main page - default [tablet portrait]",
      "Main page - default [tablet landscape]",
      "Main page - default [mobile portrait]",
      "Main page - default [mobile landscape]",
    ]);
  });

  it("sizes the page to the viewport before running the body, and hands the body the viewport", async () => {
    const bodies: ((args: { page: unknown }) => Promise<void>)[] = [];
    const test: ViewportTestRegistrar = (_title, body) => {
      bodies.push(body as (args: { page: unknown }) => Promise<void>);
    };
    const body = vi.fn(() => Promise.resolve());
    forEachViewport(test, "t", body, [{ name: "tiny", width: 320, height: 480 }]);
    const page = { setViewportSize: vi.fn(() => Promise.resolve()) };
    await bodies[0]({ page });
    expect(page.setViewportSize).toHaveBeenCalledWith({ width: 320, height: 480 });
    expect(body).toHaveBeenCalledWith({ page }, { name: "tiny", width: 320, height: 480 });
  });

  it("defaults to the shared viewport list", () => {
    const titles: string[] = [];
    forEachViewport(
      (title) => titles.push(title),
      "x",
      () => Promise.resolve(),
    );
    expect(titles).toHaveLength(VIEWPORTS.length);
  });
});
