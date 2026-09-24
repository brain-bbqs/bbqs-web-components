# Adopting the packages in each app

What each app deletes, what replaces it, and where the two copies had drifted. Every migration is
meant to land as one pull request per app with no change in rendered output: each package's unit
tests carry the apps' own test cases over, and the apps' Chromatic baselines are the check.

Install what the app needs:

```sh
npm install @brain-bbqs/utils @brain-bbqs/ember-client @brain-bbqs/ui
npm install --save-dev @brain-bbqs/config @brain-bbqs/test-utils
```

## Tooling (all three apps)

| Delete                                                  | Replace with                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `configs/eslint.config.cjs`                             | `configs/eslint.config.js` calling `createEslintConfig` (bbqs-uploader: `complexity: 15`)                   |
| `configs/prettier.config.cjs`                           | `configs/prettier.config.js` re-exporting `@brain-bbqs/config/prettier` (clip-extractor: `printWidth: 140`) |
| `configs/tsconfig.json`'s `compilerOptions`             | `"extends": "@brain-bbqs/config/tsconfig.base.json"`                                                        |
| `configs/vite.config.ts` boilerplate                    | `createViteConfig({ rootDir, overrides })`; app-specific aliases/externals/chunks go in `overrides`         |
| `configs/vitest.config.ts`                              | `createVitestConfig({ rootDir, thresholds, coverageExclude })`                                              |
| `configs/playwright.shared.ts` + both configs           | `createPlaywrightConfig({ rootDir, testDir })` (encoding-helper keeps `globalSetup`)                        |
| `configs/storybook/main.ts`, `preview.ts`               | `createStorybookMain(...)`, `storybookPreview` (clip-extractor keeps its `staticDirs`)                      |
| `configs/appVersion.ts`                                 | `resolveAppVersion(new URL("../package.json", import.meta.url))`                                            |
| the inline `<script>` at the top of `index.html`        | `prePaintPlugin({ themeKey, settingsKey })` in the Vite config                                              |
| `.pre-commit-config.yaml`'s `--config configs/...` args | keep them, pointing at the `.js` files; the prettier hook changes too (below)                               |

Both `configs/.codespellrc` and `.github/workflows/*` stay in the apps: they are per-repository
(deploy targets, Chromatic tokens, custom words).

What the table does not show, learned adopting it in all three apps and the web-app template:

- **Prettier moves to a local pre-commit hook.** The `mirrors-prettier` hook runs in an isolated
  environment, where `configs/prettier.config.js` cannot resolve `@brain-bbqs/config`. Replace it
  with a `local`, `language: system` hook running `npx --no -- prettier --write --ignore-unknown
--config configs/prettier.config.js`, add `prettier` to `ci: skip` beside `eslint`, add a
  `format:check` script (`prettier --config configs/prettier.config.js --check .`) and run it in the
  Lint workflow, and make `prettier` a direct devDependency if the app relied on the hook's copy.
- **The Vite config imports the storage keys** from the app's settings module, with the `.ts`
  extension and `"allowImportingTsExtensions": true` in `configs/tsconfig.json`. A key that was a
  private constant in `main.ts` moves into that module first.
- **Defaults an app may not have had:** `worker.format: "es"` (an app on Vite's `iife` default
  gets module workers; ffmpeg.wasm starts its worker as a module either way), the jsdom test
  environment (pass `environment: "node"` if that was the app's), the `json` coverage reporter, and
  the shared Storybook preview (light theme pinned, Storybook's backgrounds off).
- **Nothing rendered changes.** Coverage, the integration and Chromatic specs and the Storybook build
  should all come out the same as on `main`; a difference is a missed option, not an expected cost.

## clip-extractor

| Delete                                                                                                                         | Replace with                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/instances.ts`                                                                                                             | `EMBER_INSTANCE` from ember-client; keep `OAUTH_CLIENT_ID` in the app                                                                                   |
| `lib/oauth.ts`                                                                                                                 | `createOAuthClient({ clientId: OAUTH_CLIENT_ID, storageKey: "clip-extractor.oauth-pkce.v1" })`                                                          |
| `lib/api.ts`                                                                                                                   | `apiFetch`, `listedTitle`, `nextPagePath`, `DandisetListItem` (unchanged behaviour)                                                                     |
| `lib/errors.ts`                                                                                                                | `ApiError`; `friendlyError(e, CLIP_EXTRACTOR_MESSAGES)` with the app's 403 wording                                                                      |
| `lib/dandisets.ts`                                                                                                             | `listIncomingDandisets` (same `{ datasets, unverified }` shape)                                                                                         |
| `lib/humanSubjects.ts`, `lib/users.ts`                                                                                         | same names from ember-client                                                                                                                            |
| `lib/etag.ts`                                                                                                                  | `planParts`, `hashPart`, `combineDigests`, `computeDandiEtag`, `computeMd5`; keep `computeSha256` in the app (its hash-wasm dependency stays app-local) |
| `lib/interrupt.ts`                                                                                                             | `InterruptedError`, `isInterruption`, `throwIfInterrupted` from utils                                                                                   |
| `lib/queue.ts`                                                                                                                 | `runQueue` from utils                                                                                                                                   |
| `lib/sanitize.ts`                                                                                                              | `sanitizeSegment(s, fallback, { whitespaceAs: "+", extraAllowed: "+" })`, `verbatimFilename`, `foldDiacritics`                                          |
| `lib/format.ts`: `bytes`, `initialsFrom`                                                                                       | same names from utils; `fmtTime`, `rulerStep`, `rulerLabel` stay (timeline-specific)                                                                    |
| `lib/settings.ts`                                                                                                              | `createArchiveSettingsStore<StoredSettings>(STORAGE_KEY)` plus `resolveConfig`                                                                          |
| `lib/types.ts`: archive and upload types                                                                                       | `ArchiveConfig`, `OAuthTokenSet`, `FilePart`, `ServerPart`, `UploadInitResponse`, `CompletedPart`, `Asset` from ember-client                            |
| `ui/connection.ts`                                                                                                             | `fetchArchiveUser` + `renderIdentity` from ui                                                                                                           |
| `ui/elements.ts`: the `required` helper and the header/footer entries                                                          | `required` and `getShellElements()` from ui; the player entries stay                                                                                    |
| theme toggle block in `main.ts`                                                                                                | `initThemeToggle(els.themeToggle, { storageKey: THEME_KEY })`                                                                                           |
| `renderAuthUI`'s hide/show and `delete dataset.signedIn`                                                                       | `renderAuthState(shell.account, isSignedIn())`; the delivery-toggle line stays in the app                                                               |
| human-subjects confirmed set in `main.ts`                                                                                      | `createHumanSubjectsGate(...)`; pass `intro` to `buildHumanSubjectsBanner` for the blur-tool paragraph                                                  |
| `style.css`: tokens, header, watermark, theme toggle, oauth, footer, brands, buttons, dropzone, human-subjects, dataset picker | `@import "@brain-bbqs/ui/styles/index.css"`; keep the player, timeline, browse pane and blur tool rules                                                 |
| `tests/integration/layout.ts`                                                                                                  | `@brain-bbqs/test-utils/playwright`                                                                                                                     |
| `tests/chromatic/app.chromatic.test.ts` loop                                                                                   | `forEachViewport(test, "Main page - default (no video loaded)", ...)`                                                                                   |
| the sign-in half of `tests/integration/helpers.ts` (`stubArchive`'s `addInitScript` and admin-check route)                     | `seedSignedIn(page, { storageKey: STORAGE_KEY, extraSettings: { deliveryMode: "upload" } })`; the S3 and assets routes stay                             |

Two markup changes: the sign-in button gains `class="primary oauth-signin-btn"` (the shared CSS keys
on the class rather than `#oauthSigninBtn`), and the footer marks become
`footer-brand-link`/`footer-brand-logo` (`html/page-footer.html` is the reference). The app's own
`:root[data-signed-in="1"] #deliverToggleRow[hidden]` rule stays in its stylesheet.

## bbqs-uploader

| Delete                                                                              | Replace with                                                                                                                                             |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/instances.ts`                                                                  | `EMBER_INSTANCE`; keep `OAUTH_CLIENT_ID`                                                                                                                 |
| `lib/oauth.ts`                                                                      | `createOAuthClient({ clientId, storageKey: "bbqs-uploader.oauth-pkce.v1" })`                                                                             |
| `lib/api.ts`                                                                        | `apiFetch`, `diagnoseCors` (now omits an empty `Authorization` header, as clip-extractor's did)                                                          |
| `lib/errors.ts`                                                                     | `friendlyError(e, UPLOADER_MESSAGES)` with the app's "dandiset" wording                                                                                  |
| `lib/dandisets.ts`                                                                  | `const { datasets } = await listIncomingDandisets(cfg)`; the new `unverified` count is worth surfacing in the picker's empty state                       |
| `lib/humanSubjects.ts`                                                              | same names                                                                                                                                               |
| `lib/etag.ts`                                                                       | `planParts`, `hashPart`, `combineDigests`; the worker pool keeps calling `hashPart` per part                                                             |
| `lib/queue.ts`, `lib/sanitize.ts`                                                   | `runQueue`; `sanitizeSegment`, `sanitizeFilename`, `sanitizePath` (defaults match)                                                                       |
| `lib/format.ts`                                                                     | `humanSize`, `bytesPerSecToMBps`, `initialsFrom`, `friendlyEta` from utils                                                                               |
| `lib/settings.ts`                                                                   | `createArchiveSettingsStore(STORAGE_KEY)`, `createThemeStore(THEME_KEY)`, `createFlagStore(SPEED_TIPS_COLLAPSED_KEY)`, `resolveConfig`, `configProblems` |
| `lib/types.ts`                                                                      | `UploaderConfig` becomes `ArchiveConfig` (a rename; the shape is identical)                                                                              |
| `ui/connection.ts`                                                                  | `fetchArchiveUser` + `renderIdentity`                                                                                                                    |
| `ui/dropzone.ts`: the drag/click plumbing                                           | `bindDropzone(els.dropzone, { onDrop, input: els.folderInput, browseButton: els.browseFolderBtn })`; the folder walk and reject messages stay            |
| `ui/elements.ts`: `required` and shell entries                                      | `getShellElements({ themeToggle: "theme-toggle", oauthSigninBtn: "oauth-signin-btn", ... })`                                                             |
| theme toggle, `renderAuthUI`'s first two lines, the human-subjects confirmed set    | `initThemeToggle`, `renderAuthState`, `createHumanSubjectsGate`                                                                                          |
| `style.css` shared blocks                                                           | `@import "@brain-bbqs/ui/styles/index.css"`; the file tree, progress summary, What's New modal and speed tips stay                                       |
| `tests/integration/helpers/layout.ts`, `theme.ts`, `auth.ts`                        | `@brain-bbqs/test-utils/playwright` (`seedSignedIn` takes `storageKey: STORAGE_KEY`; keep the app-specific assets-listing route beside it)               |
| the `jsonResponse`/`stubFetch` helpers in unit tests, the `Storage.prototype` spies | `@brain-bbqs/test-utils/vitest`                                                                                                                          |

Markup: `class="primary oauth-signin-btn"` on the sign-in button; `:root[data-signed-in="1"] #folder-card[hidden]` stays app-local.

## encoding-helper

| Delete                                                                                        | Replace with                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/dom.ts`: `h`, `button`, `svgEl`, `svgText`, `escapeHtml`, `resetIcon`, `copyToClipboard` | same names from ui; `gridItem`, `infoIcon`, `teachBox`, `fold`, `dataTable`, `cmdBlock` stay (they read the educational toggle)                                              |
| `lib/format.ts`: `fmtBytes`, `errorMessage`                                                   | same names from utils; the duration/bitrate/rate helpers stay                                                                                                                |
| theme toggle block in `main.ts`                                                               | `initThemeToggle(els.themeToggle, { storageKey: THEME_KEY })`                                                                                                                |
| `els.versionIndicator.textContent = ...`                                                      | `renderVersion(els.versionIndicator, __APP_VERSION__)`                                                                                                                       |
| `ui/elements.ts`: `required`                                                                  | `required` from ui                                                                                                                                                           |
| `style.css`: header, watermark, theme toggle, footer, brands                                  | `@import "@brain-bbqs/ui/styles/shell.css"` after the app's own `:root` tokens (its dark palette overrides the shared one; the `--font` token is new and the app can set it) |
| `tests/integration/layout.ts`, the Chromatic loop                                             | `@brain-bbqs/test-utils/playwright`                                                                                                                                          |
| `stories/utils.ts`                                                                            | copy of `packages/ui/stories/utils.ts` is fine to keep; `storybookPreview` replaces `preview.ts`                                                                             |

The footer's `.footer-brands` breakpoint moves from the app's 1560px to the shared 1400px unless the
app overrides it; check the "frames the page with the BBQS, CON, and Talmo Lab watermarks" spec's
viewport against whichever it keeps.

## Order of operations

1. `@brain-bbqs/config` first: it changes no runtime code, and the diff is the deleted `configs/`.
2. `@brain-bbqs/utils` and `@brain-bbqs/test-utils`: pure functions and test scaffolding, one PR.
3. `@brain-bbqs/ember-client`: the app's unit tests for the deleted modules move with them; what
   remains are the app's tests of its own `main.ts`.
4. `@brain-bbqs/ui` last, in two steps: the stylesheet import (Chromatic shows any drift), then the
   behaviour helpers.
