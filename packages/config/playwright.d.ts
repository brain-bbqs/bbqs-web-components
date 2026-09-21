import type { PlaywrightTestConfig } from "@playwright/test";

export interface PlaywrightConfigOptions {
  /** The app root: where `npm run build && npm run preview` runs. */
  rootDir: string | URL;
  /** Where the specs are, relative to the calling config file. */
  testDir: string;
  /** The preview server's port (default 4173). */
  port?: number;
  /** Overrides the build-and-preview command. */
  webServerCommand?: string;
  /** Pass `false` for a suite that needs no server. */
  webServer?: false;
  /** A module run once before any worker starts. */
  globalSetup?: string;
  /** Anything else, spread over the shared settings. */
  overrides?: Partial<PlaywrightTestConfig>;
}

export declare function createPlaywrightConfig(options: PlaywrightConfigOptions): PlaywrightTestConfig;
