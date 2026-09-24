import { createVitestConfig } from "./vitest.js";

export default createVitestConfig({
  rootDir: new URL(".", import.meta.url),
  environment: "node",
  include: ["tests/**/*.test.ts"],
  packageJson: false,
  thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
  coverageInclude: ["*.js"],
  overrides: { test: { name: "config" } },
});
