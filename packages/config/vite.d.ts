import type { UserConfig } from "vite";

export interface ViteConfigOptions {
  /** The app root (where index.html lives), as a path or `file:` URL. */
  rootDir: string | URL;
  /** The package.json `__APP_VERSION__` is read from. Defaults to `<rootDir>/package.json`. */
  packageJson?: string | URL;
  /** App-specific settings merged on top with Vite's `mergeConfig`. */
  overrides?: UserConfig;
}

/** Root, relative base, `__APP_VERSION__` define and ES-module workers, merged with `overrides`. */
export declare function createViteConfig(options: ViteConfigOptions): UserConfig;

export { prePaintPlugin, prePaintScript } from "./pre-paint.js";
