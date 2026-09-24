import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import { resolveAppVersion } from "./app-version.js";

/**
 * @typedef {object} ViteConfigOptions
 * @property {string | URL} rootDir The app root (where index.html lives). A `file:` URL such as
 *   `new URL("..", import.meta.url)` from a config under `configs/`, or a path.
 * @property {string | URL} [packageJson] The package.json `__APP_VERSION__` is read from.
 *   Defaults to `<rootDir>/package.json`.
 * @property {import("vite").UserConfig} [overrides] App-specific settings merged on top with
 *   Vite's own `mergeConfig` (aliases, manual chunks, externals).
 */

/**
 * @param {string | URL} dir
 * @returns {string}
 */
function toPath(dir) {
  return typeof dir === "string" ? dir : fileURLToPath(dir);
}

/**
 * The Vite settings every app shares: the root, a relative `base` (the built apps are served from
 * subpaths such as PR previews under gh-pages), the `__APP_VERSION__` define read from
 * package.json, and ES-module workers.
 *
 * @param {ViteConfigOptions} options
 * @returns {import("vite").UserConfig}
 */
export function createViteConfig({ rootDir, packageJson, overrides = {} }) {
  const root = toPath(rootDir);
  const pkg = packageJson ?? new URL("package.json", root.endsWith("/") ? `file://${root}` : `file://${root}/`);
  /** @type {import("vite").UserConfig} */
  const base = {
    root,
    base: "./",
    define: {
      __APP_VERSION__: JSON.stringify(resolveAppVersion(pkg)),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    worker: {
      format: "es",
    },
  };
  return mergeConfig(base, overrides);
}

export { PRE_PAINT_PLUGIN_NAME, prePaintPlugin, prePaintScript } from "./pre-paint.js";
