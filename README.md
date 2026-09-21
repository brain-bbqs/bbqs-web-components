# brain-bbqs-web-components

Common components shared across the BBQS companion web apps ([clip-extractor](https://github.com/brain-bbqs/clip-extractor),
[encoding-helper](https://github.com/brain-bbqs/encoding-helper), [bbqs-uploader](https://github.com/brain-bbqs/bbqs-uploader)),
kept in one npm-workspaces monorepo and published as independently versioned `@brain-bbqs/*` packages.

| Package                                             | What it holds                                                                                                         | Adopted by                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [`@brain-bbqs/config`](packages/config)             | ESLint, Prettier, tsconfig, Vite, Vitest, Playwright and Storybook configs; `resolveAppVersion`; the pre-paint script | all three                     |
| [`@brain-bbqs/utils`](packages/utils)               | Byte/ETA/initials formatting, `runQueue`, path sanitization, cooperative interruption, safe localStorage stores       | all three                     |
| [`@brain-bbqs/ember-client`](packages/ember-client) | PKCE sign-in, `apiFetch`, the Incoming dataset picker, the human-subjects gate, dandi-etag hashing, settings          | clip-extractor, bbqs-uploader |
| [`@brain-bbqs/ui`](packages/ui)                     | Theme tokens and toggle, account menu, watermark and footer, human-subjects banner, dropzone, DOM helpers, CSS        | all three                     |
| [`@brain-bbqs/test-utils`](packages/test-utils)     | Playwright viewport/overflow/sign-in helpers and the Chromatic per-viewport pattern; Vitest fixtures                  | all three                     |

Each package's README maps its exports back to the app files they replace. [docs/ADOPTION.md](docs/ADOPTION.md)
walks each app through the switch; [docs/VENDORING.md](docs/VENDORING.md) explains how the packages are
versioned and published, and the alternatives that were considered.

## Layout

```
packages/
  config/        plain ESM JavaScript + .d.ts (no build step, so eslint/prettier configs can load it)
  utils/         TypeScript, built to dist/ with declarations
  ember-client/  depends on utils
  ui/            depends on utils; ships styles/ and html/ reference fragments; has a Storybook
  test-utils/    depends on ember-client; two entry points, ./playwright and ./vitest
configs/
  aliases.ts           Vite aliases pointing @brain-bbqs/* at sibling source, for tests and Storybook
  tsconfig.base.json   the published base tsconfig plus monorepo-only `paths` to sibling source
  tsconfig.json        project references that typecheck every package
  tsconfig.build.json  project references that build every dist/ in dependency order
  eslint.config.js, prettier.config.js, vitest.config.ts   the root runs of each tool
.changeset/            pending version bumps (see below)
```

The root configs live under `configs/`, as in the apps, and the npm scripts pass them with
`--config`. Editor extensions need pointing at them (`eslint.options.overrideConfigFile` and
`prettier.configPath` in VS Code); the per-package `tsconfig.json` files are found on their own.

Inside the repo, packages import each other by name and resolve to source (through `paths` and the
Vite aliases), so nothing needs building to typecheck, lint or test. `npm run build` emits each
package's `dist/` from its `tsconfig.build.json`, typing cross-package imports from the sibling's
`dist/` declarations the way an installed consumer will see them.

## Working on it

```sh
npm ci
npm run typecheck        # tsc -b over every package
npm run lint             # the same @brain-bbqs/config/eslint rules the apps use
npm test                 # every package's unit tests in one vitest run
npm run test:coverage    # per package, enforcing each package's coverage floor (100% on the TS packages)
npm run test:integration # @brain-bbqs/test-utils' Playwright specs (PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome reuses a local browser)
npm run build            # dist/ for every package, in dependency order
npm run storybook        # the ui package's stories
```

`pre-commit` runs prettier, eslint, codespell and the REUSE check, as in the apps.

## Releasing

Versions are managed with [Changesets](https://github.com/changesets/changesets). A pull request that
changes a package's published surface adds a changeset (`npx changeset`) naming the packages and the
bump for each. On `main`, `.github/workflows/release.yml` keeps a "Version Packages" pull request up
to date; merging it bumps the versions, rewrites each package's `CHANGELOG.md` and publishes to npm
with provenance. Internal dependencies (`@brain-bbqs/ui` on `@brain-bbqs/utils`) are bumped together.
