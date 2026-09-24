import { createVitestConfig } from "@brain-bbqs/config/vitest";
import { workspaceAliases } from "../../configs/aliases.js";

export default createVitestConfig({
  rootDir: new URL(".", import.meta.url),
  packageJson: false,
  thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
  overrides: { test: { name: "ui" }, resolve: { alias: workspaceAliases } },
});
