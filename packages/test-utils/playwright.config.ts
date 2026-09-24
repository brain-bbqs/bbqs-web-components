import { defineConfig } from "@playwright/test";
import { createPlaywrightConfig } from "@brain-bbqs/config/playwright";

// The helpers are exercised against pages the specs set themselves (page.setContent), so no app
// server is built or served.
export default defineConfig(
  createPlaywrightConfig({ rootDir: new URL(".", import.meta.url), testDir: "tests/integration", webServer: false }),
);
