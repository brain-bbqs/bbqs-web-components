import { createVitestConfig } from "@brain-bbqs/config/vitest";
import { workspaceAliases } from "../../tooling/aliases.js";

export default createVitestConfig({
  rootDir: new URL(".", import.meta.url),
  packageJson: false,
  // The Playwright half is covered by tests/integration (a real browser), not by vitest.
  coverageInclude: ["src/vitest/**/*.ts"],
  thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
  overrides: { test: { name: "test-utils" }, resolve: { alias: workspaceAliases } },
});
