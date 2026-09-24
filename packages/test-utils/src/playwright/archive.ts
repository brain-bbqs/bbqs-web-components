import type { Page, Route } from "@playwright/test";
import { ADMIN_CHECK_BASE_URL, EMBER_INSTANCE } from "@brain-bbqs/ember-client";

// Stubs for the archive calls the sign-in flow makes, so a spec can pick straight up at "signed in"
// instead of driving the real PKCE redirect. Playwright hands each request to the most recently
// registered matching handler, so a spec overrides any of these by registering its own route for
// the same URL after calling them.

export interface StubDandiset {
  identifier?: string;
  title?: string;
  embargoed?: boolean;
}

export interface SeedSignedInOptions extends StubDandiset {
  /** The app's settings key, e.g. "bbqs-uploader.settings.v1". */
  storageKey: string;
  /** Extra fields stored alongside the tokens (clip-extractor seeds `deliveryMode: "upload"`). */
  extraSettings?: Record<string, unknown>;
  /** The archive's API base; defaults to EMBER's. */
  api?: string;
  adminCheckBaseUrl?: string;
  /** The draft description the human-subjects gate reads; defaults to an unflagged one. */
  draftDescription?: string;
}

/** Mocks the "my incoming datasets" listing with one dataset. */
export async function stubIncomingDandisets(
  page: Page,
  { identifier = "000123", title = "Incoming: Test Lab", embargoed = true }: StubDandiset = {},
  api: string = EMBER_INSTANCE.api,
): Promise<void> {
  await page.route(`${api}/dandisets/?user=me&embargoed=true&page_size=1000`, (route: Route) =>
    route.fulfill({
      json: {
        count: 1,
        next: null,
        previous: null,
        results: [{ identifier, draft_version: { name: title }, embargo_status: embargoed ? "EMBARGOED" : "OPEN" }],
      },
    }),
  );
}

/** Mocks the admin-check service's answer for one dataset. */
export async function stubAdminCheck(
  page: Page,
  identifier = "000123",
  adminOwned = true,
  adminCheckBaseUrl: string = ADMIN_CHECK_BASE_URL,
): Promise<void> {
  await page.route(`${adminCheckBaseUrl}/admin-owned/${identifier}`, (route: Route) =>
    route.fulfill({ json: { adminOwned } }),
  );
}

/** Mocks the draft metadata the human-subjects gate reads for one dataset. */
export async function stubDraftMetadata(
  page: Page,
  identifier = "000123",
  { title = "Incoming: Test Lab", description = "A test dataset." }: { title?: string; description?: string } = {},
  api: string = EMBER_INSTANCE.api,
): Promise<void> {
  await page.route(`${api}/dandisets/${identifier}/versions/draft/`, (route: Route) =>
    route.fulfill({ json: { name: title, description } }),
  );
}

/** Mocks /users/me/, which fills the header's avatar and username. */
export async function stubIdentity(
  page: Page,
  { username = "test-user", name = "Test User" }: { username?: string; name?: string } = {},
  api: string = EMBER_INSTANCE.api,
): Promise<void> {
  await page.route(`${api}/users/me/`, (route: Route) => route.fulfill({ json: { username, name } }));
}

/**
 * Seeds an already-signed-in session (stored tokens under the app's settings key) before the
 * page's own script runs, and mocks the calls sign-in fans out to: the incoming-datasets listing,
 * the admin-owner check, and the selected draft's metadata.
 */
export async function seedSignedIn(page: Page, options: SeedSignedInOptions): Promise<void> {
  const {
    storageKey,
    extraSettings = {},
    identifier = "000123",
    title = "Incoming: Test Lab",
    embargoed = true,
    api = EMBER_INSTANCE.api,
    adminCheckBaseUrl = ADMIN_CHECK_BASE_URL,
    draftDescription = "A test dataset.",
  } = options;
  await page.addInitScript(
    ({ key, expiresAt, extra }) => {
      // Seeded only when there is nothing stored yet, since this runs before every navigation: a
      // reload has to read back what the app itself saved, or no persisted choice could be tested.
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ oauth: { accessToken: "test-token", expiresAt }, ...extra }));
      }
    },
    { key: storageKey, expiresAt: Date.now() + 3_600_000, extra: extraSettings },
  );
  await stubIncomingDandisets(page, { identifier, title, embargoed }, api);
  await stubDraftMetadata(page, identifier, { title, description: draftDescription }, api);
  await stubAdminCheck(page, identifier, true, adminCheckBaseUrl);
}
