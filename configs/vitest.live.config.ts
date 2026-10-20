import { fileURLToPath } from "node:url";
import { createVitestConfig } from "@brain-bbqs/config/vitest";
import { workspaceAliases } from "./aliases.js";

// The live checks in packages/*/tests/live, run against the real services the packages hard-code
// rather than stubs. Kept out of `npm test` (each package's own config only globs tests/unit)
// because they depend on the network and on hosts these repos do not control;
// .github/workflows/daily_live_checks.yml runs them once a day. Retries absorb a passing network
// hiccup, so an email means a service kept failing for the whole run.
export default createVitestConfig({
  rootDir: fileURLToPath(new URL("..", import.meta.url)),
  environment: "node",
  include: ["packages/*/tests/live/**/*.test.ts"],
  packageJson: false,
  overrides: { test: { testTimeout: 120_000, retry: 2 }, resolve: { alias: workspaceAliases } },
});
