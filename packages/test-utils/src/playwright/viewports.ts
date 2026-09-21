import type { Page } from "@playwright/test";
import { VIEWPORTS, type Viewport } from "./layout.js";

export type ViewportTestFn = (args: { page: Page }, viewport: Viewport) => Promise<void>;

/** The `test` function of @playwright/test or @chromatic-com/playwright: all that is used of it. */
export type ViewportTestRegistrar = (title: string, body: (args: { page: Page }) => Promise<void>) => void;

/**
 * Registers `title` once per viewport, with the viewport's name in the test title and the page
 * already sized to it. One test per viewport rather than one per Playwright project: the Chromatic
 * fixture snapshots the page after each test body, named by the test's title, so the viewport in
 * the title is what tells the captures apart.
 *
 * ```ts
 * import { test, expect } from "@chromatic-com/playwright";
 * forEachViewport(test, "Main page - default", async ({ page }) => {
 *   await page.goto("/");
 *   await expect(page.locator("h1")).toContainText("Clip Extractor");
 *   await expectNoHorizontalOverflow(page);
 * });
 * ```
 */
export function forEachViewport(
  test: ViewportTestRegistrar,
  title: string,
  body: ViewportTestFn,
  viewports: readonly Viewport[] = VIEWPORTS,
): void {
  for (const viewport of viewports) {
    test(`${title} [${viewport.name}]`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await body({ page }, viewport);
    });
  }
}
