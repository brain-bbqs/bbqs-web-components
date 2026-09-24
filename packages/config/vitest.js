import { fileURLToPath } from "node:url";
import { mergeConfig } from "vitest/config";
import { resolveAppVersion } from "./app-version.js";

/**
 * @typedef {object} VitestConfigOptions
 * @property {string | URL} rootDir The project root the test globs and coverage paths are relative to.
 * @property {"jsdom" | "node" | "happy-dom"} [environment] Default test environment. jsdom, as two
 *   of the three apps run; a file that needs another says so with `// @vitest-environment`.
 * @property {string[]} [include] Test file globs. Defaults to `tests/unit/**\/*.test.ts`.
 * @property {string[]} [coverageInclude] Files coverage is measured over. Defaults to `src/**\/*.ts`.
 * @property {string[]} [coverageExclude] Files left out of coverage on top of the standard set
 *   (declarations, tests, stories, configs).
 * @property {import("vitest/node").CoverageOptions["thresholds"]} [thresholds] Coverage floors.
 * @property {string | URL | false} [packageJson] The package.json `__APP_VERSION__` is read from,
 *   or `false` to skip the define. Defaults to `<rootDir>/package.json`.
 * @property {import("vitest/config").ViteUserConfig} [overrides] Anything else, merged on top.
 */

/**
 * @param {string | URL} dir
 * @returns {string}
 */
function toPath(dir) {
  return typeof dir === "string" ? dir : fileURLToPath(dir);
}

/**
 * The Vitest settings the apps share: root, environment, the unit-test glob, v8 coverage over src/
 * with the text, lcov and json reporters, and the same `__APP_VERSION__` define the Vite build
 * performs so any module reading it can be imported under test.
 *
 * @param {VitestConfigOptions} options
 * @returns {import("vitest/config").ViteUserConfig}
 */
export function createVitestConfig({
  rootDir,
  environment = "jsdom",
  include = ["tests/unit/**/*.test.ts"],
  coverageInclude = ["src/**/*.ts"],
  coverageExclude = [],
  thresholds,
  packageJson,
  overrides = {},
}) {
  const root = toPath(rootDir);
  const rootUrl = root.endsWith("/") ? `file://${root}` : `file://${root}/`;
  const pkg = packageJson === undefined ? new URL("package.json", rootUrl) : packageJson;
  /** @type {import("vitest/config").ViteUserConfig} */
  const base = {
    root,
    define: pkg === false ? {} : { __APP_VERSION__: JSON.stringify(resolveAppVersion(pkg)) },
    test: {
      environment,
      include,
      coverage: {
        provider: "v8",
        include: coverageInclude,
        exclude: [
          "**/*.d.ts",
          "**/*.test.ts",
          "**/*.spec.ts",
          "stories/**",
          "tests/**",
          "configs/**",
          ...coverageExclude,
        ],
        reporter: ["text", "lcov", "json"],
        ...(thresholds ? { thresholds } : {}),
      },
    },
  };
  return mergeConfig(base, overrides);
}
