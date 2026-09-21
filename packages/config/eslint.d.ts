import type { ConfigArray } from "typescript-eslint";

export declare const DEFAULT_IGNORES: string[];

export interface EslintConfigOptions {
  /** Directory holding the tsconfig.json the type-aware rules resolve types through. */
  tsconfigRootDir: string;
  /** Globs the type-aware rules run on. Defaults to `src/**\/*.ts` and `configs/**\/*.ts`. */
  typeAwareFiles?: string[];
  /** Extra ignore globs, added to {@link DEFAULT_IGNORES}. */
  ignores?: string[];
  /** Cyclomatic complexity cap per function (default 20). */
  complexity?: number;
  /** Block nesting cap (default 4). */
  maxDepth?: number;
  /** Further config objects appended after the shared ones. */
  extend?: ConfigArray;
}

export declare function createEslintConfig(options: EslintConfigOptions): ConfigArray;
