import { resolveAppVersion } from "./app-version.js";

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
 * The Storybook `main.ts` the apps share: the html-vite framework, no addons, and the same
 * `__APP_VERSION__` define the app build performs so story markup can stamp the footer version.
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
      config.define = {
        ...config.define,
        __APP_VERSION__: JSON.stringify(resolveAppVersion(packageJson)),
      };
      return viteFinal ? viteFinal(config) : config;
    },
  };
}

/**
 * The Storybook preview the apps share, minus the stylesheet import (each app's `preview.ts` adds
 * `import "../../src/style.css"` itself, since a JS module cannot import CSS on the app's behalf).
 *
 * The app stylesheets theme <body> themselves (light by default, dark via data-theme or the OS
 * preference), so Storybook's own background layer is disabled rather than painted over it. The
 * toolbar switch pins data-theme explicitly, which also keeps Chromatic snapshots deterministic
 * regardless of the runner's OS color-scheme preference.
 */
export const storybookPreview = {
  parameters: {
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: "App color theme",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    /**
     * @param {() => HTMLElement} story
     * @param {{ globals: { theme?: string } }} context
     * @returns {HTMLElement}
     */
    (story, context) => {
      document.documentElement.dataset.theme = context.globals.theme ?? "light";
      return story();
    },
  ],
};
