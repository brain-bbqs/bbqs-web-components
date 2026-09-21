import { readFileSync } from "node:fs";

// Chromatic re-snapshots any page/story where this string changes, so Storybook and the Chromatic
// Playwright build pin it to a static value instead of the real (frequently-bumped) package.json
// version. Set CHROMATIC_STATIC_VERSION in those runs.
export const CHROMATIC_PLACEHOLDER_VERSION = "0.0.0";

/**
 * The version an app's footer stamps and its provenance records name, read from its package.json.
 *
 * @param {string | URL} packageJsonUrl Where the app's package.json is, typically
 *   `new URL("../package.json", import.meta.url)` from a file under `configs/`.
 * @param {NodeJS.ProcessEnv} [env] Overridable for tests; defaults to `process.env`.
 * @returns {string}
 */
export function resolveAppVersion(packageJsonUrl, env = process.env) {
  if (env.CHROMATIC_STATIC_VERSION) {
    return CHROMATIC_PLACEHOLDER_VERSION;
  }
  const pkg = /** @type {{ version: string }} */ (JSON.parse(readFileSync(packageJsonUrl, "utf-8")));
  return pkg.version;
}
