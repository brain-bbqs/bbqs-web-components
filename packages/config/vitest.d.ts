import type { ViteUserConfig } from "vitest/config";
import type { CoverageOptions } from "vitest/node";

export interface VitestConfigOptions {
  /** The project root the test globs and coverage paths are relative to. */
  rootDir: string | URL;
  /** Default test environment (default "jsdom"). */
  environment?: "jsdom" | "node" | "happy-dom";
  /** Test file globs (default `tests/unit/**\/*.test.ts`). */
  include?: string[];
  /** Files coverage is measured over (default `src/**\/*.ts`). */
  coverageInclude?: string[];
  /** Extra coverage exclusions. */
  coverageExclude?: string[];
  /** Coverage floors. */
  thresholds?: CoverageOptions["thresholds"];
  /** The package.json `__APP_VERSION__` is read from, or `false` to skip the define. */
  packageJson?: string | URL | false;
  /** Anything else, merged on top. */
  overrides?: ViteUserConfig;
}

export declare function createVitestConfig(options: VitestConfigOptions): ViteUserConfig;
