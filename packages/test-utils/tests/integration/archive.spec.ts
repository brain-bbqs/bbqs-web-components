import { expect, test, type Page } from "@playwright/test";
import { ADMIN_CHECK_BASE_URL, EMBER_INSTANCE } from "@brain-bbqs/ember-client";
import { seedSignedIn, seedTheme, stubIdentity } from "../../src/playwright/index.js";

const SETTINGS_KEY = "test-app.settings.v1";
const THEME_KEY = "test-app.theme";

// A stand-in for an app, served from a routed origin rather than about:blank: an opaque origin has
// no localStorage, and the seeding helpers write to it before the page's own script runs. The page
// reads back what was seeded, so the assertions are on the helpers, not on any app.
const APP_URL = "https://app.test/";
const PAGE = `<!doctype html><html><body><pre id="out"></pre><script>
  document.getElementById("out").textContent = JSON.stringify({
    settings: localStorage.getItem(${JSON.stringify(SETTINGS_KEY)}),
    theme: localStorage.getItem(${JSON.stringify(THEME_KEY)}),
  });
</script></body></html>`;

async function openApp(page: Page): Promise<{ settings: string | null; theme: string | null }> {
  await page.route(APP_URL, (route) => route.fulfill({ contentType: "text/html", body: PAGE }));
  await page.goto(APP_URL);
  return JSON.parse((await page.locator("#out").textContent()) ?? "{}") as {
    settings: string | null;
    theme: string | null;
  };
}

async function fetchJson(page: Page, url: string): Promise<unknown> {
  return page.evaluate(async (u): Promise<unknown> => (await fetch(u)).json(), url);
}

test.describe("seedSignedIn", () => {
  test("stores tokens under the app's key before the page's own script runs", async ({ page }) => {
    await seedSignedIn(page, { storageKey: SETTINGS_KEY, extraSettings: { deliveryMode: "upload" } });
    const out = await openApp(page);
    const settings = JSON.parse(out.settings ?? "{}") as {
      oauth: { accessToken: string; expiresAt: number };
      deliveryMode: string;
    };
    expect(settings.oauth.accessToken).toBe("test-token");
    expect(settings.oauth.expiresAt).toBeGreaterThan(Date.now());
    expect(settings.deliveryMode).toBe("upload");
  });

  test("leaves settings the page itself saved alone on a reload", async ({ page }) => {
    await seedSignedIn(page, { storageKey: SETTINGS_KEY });
    await openApp(page);
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ dandisetId: "000999" })), SETTINGS_KEY);
    const out = await openApp(page);
    expect(out.settings).toBe(JSON.stringify({ dandisetId: "000999" }));
  });

  test("mocks the dataset listing, the draft metadata and the admin check", async ({ page }) => {
    await seedSignedIn(page, {
      storageKey: SETTINGS_KEY,
      identifier: "000777",
      title: "Incoming: Seeded",
      embargoed: false,
    });
    await openApp(page);
    const listing = (await fetchJson(
      page,
      `${EMBER_INSTANCE.api}/dandisets/?user=me&embargoed=true&page_size=1000`,
    )) as {
      results: { identifier: string; draft_version: { name: string }; embargo_status: string }[];
    };
    expect(listing.results).toEqual([
      { identifier: "000777", draft_version: { name: "Incoming: Seeded" }, embargo_status: "OPEN" },
    ]);
    expect(await fetchJson(page, `${EMBER_INSTANCE.api}/dandisets/000777/versions/draft/`)).toEqual({
      name: "Incoming: Seeded",
      description: "A test dataset.",
    });
    expect(await fetchJson(page, `${ADMIN_CHECK_BASE_URL}/admin-owned/000777`)).toEqual({ adminOwned: true });
  });

  test("lets a spec override any stubbed call by registering its own route afterwards", async ({ page }) => {
    await seedSignedIn(page, { storageKey: SETTINGS_KEY });
    await page.route(`${ADMIN_CHECK_BASE_URL}/admin-owned/000123`, (route) =>
      route.fulfill({ json: { adminOwned: false } }),
    );
    await stubIdentity(page, { username: "ada", name: "Ada Lovelace" });
    await openApp(page);
    expect(await fetchJson(page, `${ADMIN_CHECK_BASE_URL}/admin-owned/000123`)).toEqual({ adminOwned: false });
    expect(await fetchJson(page, `${EMBER_INSTANCE.api}/users/me/`)).toEqual({ username: "ada", name: "Ada Lovelace" });
  });
});

test.describe("seedTheme", () => {
  test("seeds the stored override before the page reads it", async ({ page }) => {
    await seedTheme(page, "dark", { storageKey: THEME_KEY });
    const out = await openApp(page);
    expect(out.theme).toBe("dark");
  });
});
