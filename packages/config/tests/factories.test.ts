import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { InlineConfig } from "vite";
import { describe, expect, it } from "vitest";
import { createEslintConfig, DEFAULT_IGNORES } from "../eslint.js";
import { createPlaywrightConfig } from "../playwright.js";
import prettierConfig from "../prettier.js";
import { createStorybookMain, storybookPreview } from "../storybook.js";
import { createViteConfig, prePaintPlugin } from "../vite.js";
import { createVitestConfig } from "../vitest.js";

/** A throwaway app root holding a package.json, the one file every factory reads. */
function appRoot(version = "3.2.1"): string {
  const dir = mkdtempSync(join(tmpdir(), "bbqs-app-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "app", version }));
  return dir;
}

describe("createEslintConfig", () => {
  const config = createEslintConfig({ tsconfigRootDir: "/repo" });

  it("ignores every build output directory the apps produce", () => {
    expect(config[0].ignores).toEqual(DEFAULT_IGNORES);
    expect(createEslintConfig({ tsconfigRootDir: "/repo", ignores: ["docs/"] })[0].ignores).toContain("docs/");
  });

  it("runs the type-aware rules over src/ and configs/ by default, through the project service", () => {
    // tseslint.config() flattens `extends` into the preceding entries, so several objects carry the
    // type-aware file globs; the one with the parser options is the one written here.
    const typeAware = config.find((c) => c.languageOptions?.parserOptions?.projectService === true);
    expect(typeAware?.files).toEqual(["src/**/*.ts", "configs/**/*.ts"]);
    expect(typeAware?.languageOptions?.parserOptions).toEqual({ projectService: true, tsconfigRootDir: "/repo" });
    expect(typeAware?.rules?.["@typescript-eslint/no-floating-promises"]).toBe("error");
    expect(config.filter((c) => c.files?.[0] === "src/**/*.ts").length).toBeGreaterThan(1);
  });

  it("caps complexity at 20 and nesting at 4 unless told otherwise", () => {
    const caps = config.find((c) => c.rules?.complexity);
    expect(caps?.rules?.complexity).toEqual(["error", 20]);
    expect(caps?.rules?.["max-depth"]).toEqual(["error", 4]);
    const stricter = createEslintConfig({ tsconfigRootDir: "/repo", complexity: 15 });
    expect(stricter.find((c) => c.rules?.complexity)?.rules?.complexity).toEqual(["error", 15]);
  });

  it("appends app-specific overrides last, so they win", () => {
    const extended = createEslintConfig({ tsconfigRootDir: "/repo", extend: [{ rules: { "no-console": "warn" } }] });
    expect(extended.at(-1)?.rules).toEqual({ "no-console": "warn" });
  });
});

describe("prettier config", () => {
  it("keeps the settings the apps agreed on", () => {
    expect(prettierConfig).toMatchObject({ printWidth: 120, trailingComma: "all", singleQuote: false, semi: true });
  });
});

describe("createViteConfig", () => {
  it("sets the root, a relative base, the version define and ES-module workers", () => {
    const root = appRoot("3.2.1");
    const config = createViteConfig({ rootDir: root });
    expect(config.root).toBe(root);
    expect(config.base).toBe("./");
    expect(config.define?.__APP_VERSION__).toBe('"3.2.1"');
    expect(config.worker?.format).toBe("es");
    expect(config.build).toEqual({ outDir: "dist", emptyOutDir: true });
  });

  it("accepts a file URL for the root, as a config under configs/ passes", () => {
    const root = appRoot();
    const config = createViteConfig({ rootDir: pathToFileURL(`${root}/`) });
    expect(config.root?.replace(/\/$/, "")).toBe(root);
  });

  it("deep-merges app overrides rather than replacing whole sections", () => {
    const config = createViteConfig({
      rootDir: appRoot(),
      overrides: { build: { rolldownOptions: { external: ["skia-canvas"] } }, define: { __X__: "1" } },
    });
    expect(config.build).toMatchObject({
      outDir: "dist",
      emptyOutDir: true,
      rolldownOptions: { external: ["skia-canvas"] },
    });
    expect(config.define).toMatchObject({ __APP_VERSION__: '"3.2.1"', __X__: "1" });
  });
});

describe("createVitestConfig", () => {
  it("defaults to jsdom, the unit-test glob, v8 coverage over src/ and the version define", () => {
    const root = appRoot("1.0.0");
    const config = createVitestConfig({ rootDir: root });
    expect(config.test?.environment).toBe("jsdom");
    expect(config.test?.include).toEqual(["tests/unit/**/*.test.ts"]);
    expect(config.test?.coverage).toMatchObject({
      provider: "v8",
      include: ["src/**/*.ts"],
      reporter: ["text", "lcov", "json"],
    });
    expect(config.define?.__APP_VERSION__).toBe('"1.0.0"');
  });

  it("accepts a file URL for the root and finds the package.json beside it", () => {
    const root = appRoot("7.0.0");
    const config = createVitestConfig({ rootDir: pathToFileURL(`${root}/`) });
    expect(config.root).toBe(`${root}/`);
    expect(config.define?.__APP_VERSION__).toBe('"7.0.0"');
  });

  it("skips the define when told there is no package.json to read", () => {
    const config = createVitestConfig({ rootDir: "/nowhere", packageJson: false });
    expect(config.define).toEqual({});
  });

  it("carries coverage floors and extra exclusions through", () => {
    const config = createVitestConfig({
      rootDir: appRoot(),
      thresholds: { lines: 99 },
      coverageExclude: ["src/main.ts"],
      overrides: { test: { clearMocks: false } },
    });
    expect(config.test?.coverage).toMatchObject({ thresholds: { lines: 99 } });
    expect(config.test?.coverage && "exclude" in config.test.coverage ? config.test.coverage.exclude : []).toContain(
      "src/main.ts",
    );
    expect(config.test?.clearMocks).toBe(false);
  });

  it("replaces the coverage reporters when given a list, which overrides would only append to", () => {
    const config = createVitestConfig({ rootDir: appRoot(), coverageReporter: ["text", "lcov"] });
    expect(config.test?.coverage && "reporter" in config.test.coverage ? config.test.coverage.reporter : []).toEqual([
      "text",
      "lcov",
    ]);
  });
});

describe("createPlaywrightConfig", () => {
  it("serves the built app from vite preview on the shared port, in one Desktop Chrome project", () => {
    const config = createPlaywrightConfig({ rootDir: "/app", testDir: "../tests/integration" });
    expect(config.testDir).toBe("../tests/integration");
    expect(config.use?.baseURL).toBe("http://localhost:4173");
    const server = config.webServer as { command: string; cwd: string; url: string };
    expect(server.command).toBe("npm run build && npm run preview -- --port 4173 --strictPort");
    expect(server.cwd).toBe("/app");
    expect(config.projects?.map((p) => p.name)).toEqual(["chromium"]);
  });

  it("can run without a server, for a suite that sets its own page content", () => {
    const config = createPlaywrightConfig({ rootDir: "/app", testDir: "tests", webServer: false });
    expect(config.webServer).toBe(undefined);
  });

  it("takes a file URL for the root and reuses a pre-installed browser when told to", () => {
    process.env.PLAYWRIGHT_CHROMIUM_PATH = "/opt/browsers/chromium";
    try {
      const config = createPlaywrightConfig({ rootDir: pathToFileURL("/app/"), testDir: "t" });
      expect((config.webServer as { cwd: string }).cwd).toBe("/app/");
      expect(config.projects?.[0].use?.launchOptions).toEqual({ executablePath: "/opt/browsers/chromium" });
    } finally {
      delete process.env.PLAYWRIGHT_CHROMIUM_PATH;
    }
  });

  it("threads a global setup and a custom port through", () => {
    const config = createPlaywrightConfig({ rootDir: "/app", testDir: "t", port: 5000, globalSetup: "/app/setup.ts" });
    expect(config.globalSetup).toBe("/app/setup.ts");
    expect(config.use?.baseURL).toBe("http://localhost:5000");
    expect((config.webServer as { url: string }).url).toBe("http://localhost:5000");
  });
});

describe("createStorybookMain", () => {
  it("uses the html-vite framework and defines the version for stories", async () => {
    const root = appRoot("4.5.6");
    const main = createStorybookMain({ packageJson: join(root, "package.json") });
    expect(main.framework).toEqual({ name: "@storybook/html-vite", options: {} });
    expect(main.stories).toEqual(["../../stories/**/*.stories.@(ts|js)"]);
    const viteFinal = main.viteFinal as (c: InlineConfig) => Promise<InlineConfig>;
    const config = await viteFinal({ define: { __KEEP__: "1" } });
    expect(config.define).toEqual({ __KEEP__: "1", __APP_VERSION__: '"4.5.6"' });
  });

  it("mounts static dirs and lets the caller finish the Vite config", async () => {
    const root = appRoot();
    const main = createStorybookMain({
      packageJson: join(root, "package.json"),
      staticDirs: [{ from: "../../src/assets", to: "/src/assets" }],
      viteFinal: (c) => ({ ...c, base: "/x/" }),
    });
    expect(main.staticDirs).toEqual([{ from: "../../src/assets", to: "/src/assets" }]);
    const viteFinal = main.viteFinal as (c: InlineConfig) => Promise<InlineConfig>;
    expect((await viteFinal({})).base).toBe("/x/");
  });

  it("drops the app's pre-paint plugin, however deeply its plugin list nests it", async () => {
    const main = createStorybookMain({ packageJson: join(appRoot(), "package.json") });
    const viteFinal = main.viteFinal as (c: InlineConfig) => Promise<InlineConfig>;
    const other = { name: "other" };
    const config = await viteFinal({ plugins: [other, [[prePaintPlugin({ themeKey: "t" })]], null] });
    expect(config.plugins).toEqual([other, null]);
  });
});

describe("storybookPreview", () => {
  it("disables Storybook's own backgrounds and offers a light/dark toolbar", () => {
    expect(storybookPreview.parameters.backgrounds.disable).toBe(true);
    expect(storybookPreview.globalTypes.theme.toolbar.items.map((i) => i.value)).toEqual(["light", "dark"]);
    expect(storybookPreview.initialGlobals.theme).toBe("light");
  });
});
