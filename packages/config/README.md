# @brain-bbqs/config

The tooling configuration the BBQS companion apps used to carry as `configs/*`, as one package.
Plain ESM JavaScript with type declarations, so an app's `eslint.config.js` can import it with
nothing built first.

```sh
npm install --save-dev @brain-bbqs/config
```

| Import                                  | Replaces in each app                             |
| --------------------------------------- | ------------------------------------------------ |
| `@brain-bbqs/config/eslint`             | `configs/eslint.config.cjs`                      |
| `@brain-bbqs/config/prettier`           | `configs/prettier.config.cjs`                    |
| `@brain-bbqs/config/tsconfig.base.json` | `configs/tsconfig.json` (`compilerOptions`)      |
| `@brain-bbqs/config/vite`               | `configs/vite.config.ts`                         |
| `@brain-bbqs/config/vitest`             | `configs/vitest.config.ts`                       |
| `@brain-bbqs/config/playwright`         | `configs/playwright.shared.ts` and both configs  |
| `@brain-bbqs/config/storybook`          | `configs/storybook/main.ts`                      |
| `@brain-bbqs/config/storybook-preview`  | `configs/storybook/preview.ts`                   |
| `@brain-bbqs/config/app-version`        | `configs/appVersion.ts`                          |
| `@brain-bbqs/config/pre-paint`          | the inline `<script>` at the top of `index.html` |

## Usage

`configs/eslint.config.js` (rename from `.cjs`; ESLint 9 and 10 load ESM flat configs directly):

```js
import path from "node:path";
import { createEslintConfig } from "@brain-bbqs/config/eslint";

export default createEslintConfig({
  tsconfigRootDir: path.resolve(import.meta.dirname, ".."), // where the app's tsconfig.json lives
  complexity: 15, // bbqs-uploader; the other apps take the default 20
});
```

`configs/prettier.config.js`:

```js
import config from "@brain-bbqs/config/prettier";
export default config; // clip-extractor: { ...config, printWidth: 140 }
```

`tsconfig.json`:

```json
{
  "extends": "@brain-bbqs/config/tsconfig.base.json",
  "include": ["src", "configs/*.ts", "configs/storybook/*.ts"]
}
```

`configs/vite.config.ts`:

```ts
import { createViteConfig, prePaintPlugin } from "@brain-bbqs/config/vite";
// With the extension (and `allowImportingTsExtensions` in the tsconfig): Vite's native config
// loader refuses extensionless imports. Keep the keys in a module with few imports of its own, since
// the config loader follows them too.
import { STORAGE_KEY, THEME_KEY } from "../src/lib/settings.ts";

export default createViteConfig({
  rootDir: new URL("..", import.meta.url),
  overrides: {
    plugins: [prePaintPlugin({ themeKey: THEME_KEY, settingsKey: STORAGE_KEY })],
  },
});
```

`configs/vitest.config.ts`:

```ts
import { createVitestConfig } from "@brain-bbqs/config/vitest";

export default createVitestConfig({
  rootDir: new URL("..", import.meta.url),
  thresholds: { statements: 99, branches: 98, functions: 99, lines: 99 },
});
```

The default environment is jsdom; an app whose suites run under node by default passes
`environment: "node"`. Array settings (the coverage reporters, say) cannot be changed through
`overrides`, since `mergeConfig` concatenates arrays; `coverageReporter` exists for that reason.

`configs/playwright.config.ts` and `configs/playwright.chromatic.config.ts`:

```ts
import { defineConfig } from "@playwright/test";
import { createPlaywrightConfig } from "@brain-bbqs/config/playwright";

export default defineConfig(
  createPlaywrightConfig({ rootDir: new URL("..", import.meta.url), testDir: "../tests/integration" }),
);
```

`configs/storybook/main.ts` and `preview.ts`:

```ts
import { createStorybookMain } from "@brain-bbqs/config/storybook";
export default createStorybookMain({ packageJson: new URL("../../package.json", import.meta.url) });
```

```ts
import "../../src/style.css";
import { storybookPreview } from "@brain-bbqs/config/storybook-preview";
// Spread: Storybook statically parses the default export and warns unless it is an object literal.
export default { ...storybookPreview };
```

The preview lives in its own entry point because `preview.ts` runs in the browser and the
`storybook` entry reads `package.json` with `node:fs`. `createStorybookMain` also takes the
pre-paint plugin back out of the app's Vite config: stories pin the theme through the preview's
decorator, and a stored sign-in would otherwise hide the signed-out states.

## Pre-paint script

The apps inline a script in `index.html` that applies the stored light/dark override (and, for the
two apps with sign-in, marks a returning signed-in visitor) before first paint. `prePaintPlugin`
injects the same script from the app's own storage-key constants, so the two literals can no longer
drift apart. Delete the inline script from `index.html` when adopting it. The script goes first in
`<head>`, where the inline copy was, so it never waits on the stylesheet.

## Chromatic

`resolveAppVersion` pins `__APP_VERSION__` to `0.0.0` whenever `CHROMATIC_STATIC_VERSION` is set,
so a version bump alone never re-snapshots every story and page.
