import { createVitestConfig } from "@brain-bbqs/config/vitest";
import { workspaceAliases } from "../../tooling/aliases.js";

export default createVitestConfig({
  rootDir: new URL(".", import.meta.url),
  packageJson: false,
  thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
  overrides: { test: { name: "ember-client" }, resolve: { alias: workspaceAliases } },
});
