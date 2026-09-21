// The ESLint flat config all three apps carried as configs/eslint.config.cjs, as a factory.
// Plain ESM JavaScript so an app's eslint.config.js can import it with nothing built first.
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

/** Output and cache directories no app wants linted. */
export const DEFAULT_IGNORES = [
  "**/dist/",
  "**/coverage/",
  "**/reports/",
  "**/storybook-static/",
  "**/test-results/",
  "**/playwright-report/",
  "**/.stryker-tmp/",
];

/**
 * @typedef {object} EslintConfigOptions
 * @property {string} tsconfigRootDir Directory holding the tsconfig.json the type-aware rules
 *   resolve types through (`import.meta.dirname` of the app's eslint.config.js, or the repo root
 *   when the config lives under configs/).
 * @property {string[]} [typeAwareFiles] Globs the type-aware rules run on. Defaults to the
 *   TypeScript the apps' tsconfig covers: `src/` and the `*.ts` under `configs/`. Files outside
 *   the tsconfig (the apps' tests/ and stories/) get the non-type-aware rules only.
 * @property {string[]} [ignores] Extra ignore globs, added to {@link DEFAULT_IGNORES}.
 * @property {number} [complexity] Cyclomatic complexity cap per function. bbqs-uploader runs at
 *   15, the other two at 20; the default keeps the looser of the two so adopting the shared config
 *   never breaks an app's lint on its own.
 * @property {number} [maxDepth] Block nesting cap.
 * @property {import("typescript-eslint").ConfigArray} [extend] Further config objects appended
 *   after the shared ones, for app-specific overrides.
 */

/**
 * @param {EslintConfigOptions} options
 * @returns {import("typescript-eslint").ConfigArray}
 */
export function createEslintConfig({
  tsconfigRootDir,
  typeAwareFiles = ["src/**/*.ts", "configs/**/*.ts"],
  ignores = [],
  complexity = 20,
  maxDepth = 4,
  extend = [],
}) {
  return tseslint.config(
    {
      ignores: [...DEFAULT_IGNORES, ...ignores],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: typeAwareFiles,
      extends: [...tseslint.configs.recommendedTypeChecked],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unnecessary-condition": "error",
        "@typescript-eslint/await-thenable": "error",
      },
    },
    {
      // Deterministic complexity caps everywhere, type info not required.
      rules: {
        complexity: ["error", complexity],
        "max-depth": ["error", maxDepth],
      },
    },
    {
      // CommonJS config files use CJS globals and require() by definition.
      files: ["**/*.cjs"],
      languageOptions: { globals: { module: "writable", require: "readonly", __dirname: "readonly" } },
      rules: { "@typescript-eslint/no-require-imports": "off" },
    },
    {
      // Plain JavaScript (config files, this package itself) runs under Node or, for a Storybook
      // decorator, the browser; type-aware linting does not cover it, so name the globals it uses.
      files: ["**/*.js", "**/*.mjs"],
      languageOptions: {
        globals: {
          process: "readonly",
          console: "readonly",
          URL: "readonly",
          document: "readonly",
          window: "readonly",
        },
      },
    },
    ...extend,
  );
}
