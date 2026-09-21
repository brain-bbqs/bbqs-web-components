import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// One root run covers every package; each keeps its own vitest.config.ts (environment, includes,
// coverage floor) so it can also be run and published on its own. `root` is the repo root so the
// globs below resolve from there rather than from this folder.
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  test: {
    projects: ["packages/*/vitest.config.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "packages/config/*.js"],
      exclude: ["**/*.d.ts", "**/dist/**"],
      reporter: ["text", "lcov", "json"],
    },
  },
});
