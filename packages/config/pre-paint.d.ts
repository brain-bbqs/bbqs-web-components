import type { Plugin } from "vite";

export interface PrePaintOptions {
  /** localStorage key holding the "light"/"dark" override. */
  themeKey: string;
  /** localStorage key holding the stored settings whose `oauth.accessToken` marks a returning
   * signed-in visitor. Omit for an app with no sign-in. */
  settingsKey?: string;
}

/** The inline script body that applies a stored theme override (and marks a returning signed-in
 * visitor) before first paint. */
export declare function prePaintScript(options: PrePaintOptions): string;

/** A Vite plugin injecting {@link prePaintScript} into <head> at build and dev time. */
export declare function prePaintPlugin(options: PrePaintOptions): Plugin;
