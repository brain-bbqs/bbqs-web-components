import { fileURLToPath } from "node:url";
import { devices } from "@playwright/test";

/**
 * @typedef {object} PlaywrightConfigOptions
 * @property {string | URL} rootDir The app root: where `npm run build && npm run preview` runs.
 * @property {string} testDir Where the specs are, relative to the config file that calls this
 *   (the apps use `../tests/integration` and `../tests/chromatic`).
 * @property {number} [port] The preview server's port (default 4173). The preview runs with
 *   `--strictPort`: without it, Vite quietly moves to the next free port when another app's preview
 *   holds this one, and the suite tests that other app instead.
 * @property {string} [webServerCommand] Overrides the build-and-preview command.
 * @property {false} [webServer] Pass `false` for a suite that needs no server.
 * @property {string} [globalSetup] A module run once before any worker starts.
 * @property {Partial<import("@playwright/test").PlaywrightTestConfig>} [overrides] Anything else.
 */

/**
 * @param {string | URL} dir
 * @returns {string}
 */
function toPath(dir) {
  return typeof dir === "string" ? dir : fileURLToPath(dir);
}

/**
 * The Playwright settings shared by the integration and Chromatic runs of every app: fully
 * parallel, list reporter, trace on first retry, the built app served by `vite preview`, and one
 * Desktop Chrome project.
 *
 * Deliberately one project rather than phone and tablet projects too: the viewports each Chromatic
 * snapshot is taken at are set per test instead, since Chromatic keys an archive by the test's title
 * alone. See `VIEWPORTS` in @brain-bbqs/test-utils/playwright.
 *
 * `PLAYWRIGHT_CHROMIUM_PATH` reuses a pre-installed browser binary (sandboxes that pin a browser
 * outside of `playwright install`).
 *
 * @param {PlaywrightConfigOptions} options
 * @returns {import("@playwright/test").PlaywrightTestConfig}
 */
export function createPlaywrightConfig({
  rootDir,
  testDir,
  port = 4173,
  webServerCommand,
  webServer,
  globalSetup,
  overrides = {},
}) {
  const root = toPath(rootDir);
  const baseURL = `http://localhost:${port}`;
  /** @type {import("@playwright/test").PlaywrightTestConfig} */
  const config = {
    testDir,
    fullyParallel: true,
    reporter: "list",
    ...(globalSetup ? { globalSetup } : {}),
    use: {
      baseURL,
      trace: "on-first-retry",
    },
    ...(webServer === false
      ? {}
      : {
          webServer: {
            command: webServerCommand ?? `npm run build && npm run preview -- --port ${port} --strictPort`,
            url: baseURL,
            cwd: root,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
        }),
    projects: [
      {
        name: "chromium",
        use: {
          ...devices["Desktop Chrome"],
          launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
            : undefined,
        },
      },
    ],
  };
  return { ...config, ...overrides };
}
