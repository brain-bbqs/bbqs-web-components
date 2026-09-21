import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, forEachViewport } from "../../src/playwright/index.js";

const FITS = `<!doctype html><html><body style="margin:0">
  <main style="max-width:400px;margin:0 auto"><h1>Fits</h1><p>Nothing here reaches past the edge.</p>
  <svg viewBox="0 0 24 24" width="20" height="20"><line x1="0" y1="0" x2="5000" y2="0"/></svg></main>
</body></html>`;

const OVERFLOWS = `<!doctype html><html><body style="margin:0">
  <div id="wide" class="row controls" style="width:3000px;height:10px"></div>
</body></html>`;

test.describe("expectNoHorizontalOverflow", () => {
  test("passes for a page that fits, ignoring shapes inside an inline svg", async ({ page }) => {
    await page.setContent(FITS);
    await expectNoHorizontalOverflow(page);
  });

  test("fails naming the element that hangs off the right edge", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.setContent(OVERFLOWS);
    const failure = await expectNoHorizontalOverflow(page).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("div#wide.row.controls (3000px wide, ends at 3000px)");
    expect((failure as Error).message).toContain("Elements past the right edge of the 800px viewport");
  });
});

// One registered test per viewport, each already sized to it. That the five are registered under
// the viewport's name is checked in tests/unit/viewports.test.ts with a fake registrar; here the
// real page is measured.
forEachViewport(test, "forEachViewport sizes the page", async ({ page }, viewport) => {
  await page.setContent("<p>sized</p>");
  const size = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  expect(size).toEqual({ width: viewport.width, height: viewport.height });
  expect(test.info().title).toBe(`forEachViewport sizes the page [${viewport.name}]`);
});
