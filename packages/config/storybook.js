import { resolveAppVersion } from "./app-version.js";
import { PRE_PAINT_PLUGIN_NAME } from "./pre-paint.js";

// Kept here too for configs written before the split; a preview.ts should import it from
// `@brain-bbqs/config/storybook-preview`, since this module reads package.json with node:fs and
// would drag that into the browser bundle.
export { storybookPreview } from "./storybook-preview.js";

/**
 * @typedef {object} StorybookMainOptions
 * @property {string | URL} packageJson The package.json `__APP_VERSION__` is read from.
 * @property {string[]} [stories] Story globs, relative to the config dir. Defaults to the apps'
 *   `../../stories/**\/*.stories.@(ts|js)`.
 * @property {import("@storybook/html-vite").StorybookConfig["staticDirs"]} [staticDirs] Static
 *   asset mounts (clip-extractor serves `src/assets` at `/src/assets` for its raw-markup story).
 * @property {(config: import("vite").InlineConfig) => import("vite").InlineConfig | Promise<import("vite").InlineConfig>} [viteFinal]
 *   Further Vite tweaks, applied after the version define.
 */

/**
 * The Storybook `main.ts` the apps share: the html-vite framework, no addons, the same
 * `__APP_VERSION__` define the app build performs so story markup can stamp the footer version, and
 * the app's pre-paint plugin taken back out.
 *
 * @param {StorybookMainOptions} options
 * @returns {import("@storybook/html-vite").StorybookConfig}
 */
export function createStorybookMain({
  packageJson,
  stories = ["../../stories/**/*.stories.@(ts|js)"],
  staticDirs,
  viteFinal,
}) {
  return {
    stories,
    addons: [],
    framework: {
      name: "@storybook/html-vite",
      options: {},
    },
    ...(staticDirs ? { staticDirs } : {}),
    async viteFinal(config) {
      // Storybook builds with the app's own Vite config, pre-paint plugin included. Stories pin the
      // theme through the decorator below, and a stored sign-in would hide the signed-out states, so
      // the script has no place in Storybook's iframe.
      config.plugins = config.plugins
        ?.flat(Infinity)
        .filter(
          (plugin) =>
            !(plugin && typeof plugin === "object" && "name" in plugin && plugin.name === PRE_PAINT_PLUGIN_NAME),
        );
      config.define = {
        ...config.define,
        __APP_VERSION__: JSON.stringify(resolveAppVersion(packageJson)),
      };
      return viteFinal ? viteFinal(config) : config;
    },
  };
}
