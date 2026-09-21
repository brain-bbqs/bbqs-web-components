import { defineConfig } from "vitest/config";

// One root run covers every package; each keeps its own vitest.config.ts (environment, includes,
// coverage floor) so it can also be run and published on its own.
export default defineConfig({
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
