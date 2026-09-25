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
- **Theme and flag stores keep the app's warning.** `createChoiceStore(key, values, onError)` and
  `createFlagStore(key, onError)` pass a failed write to `onError`, so an app whose tests assert its
  own "Could not save ..." wording keeps it.
- **A harness that strips scripts** uses `bodyOf(html, { stripScripts: true })` in a jsdom suite.
- **Hashing errors keep the app's wording.** `createEtag({ emptyFile, fileChanged })` returns
  `planParts`, `hashPart`, `computeDandiEtag`, `computeMd5` and `readChunks` throwing the app's own
  messages (bbqs-uploader's "uploaded to DANDI", clip-extractor's "please re-load it"), and
  `readChunks` is the chunked reader for an app-local digest such as clip-extractor's SHA-256.
- **Nothing rendered changes.** Coverage, the integration and Chromatic specs and the Storybook build
  should all come out the same as on `main`; a difference is a missed option, not an expected cost.

## clip-extractor

| Delete                                                                                                     | Replace with                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/instances.ts`                                                                                         | `EMBER_INSTANCE` from ember-client; keep `OAUTH_CLIENT_ID` in the app                                                                                   |
| `lib/oauth.ts`                                                                                             | `createOAuthClient({ clientId: OAUTH_CLIENT_ID, storageKey: "clip-extractor.oauth-pkce.v1" })`                                                          |
| `lib/api.ts`                                                                                               | `apiFetch`, `listedTitle`, `nextPagePath`, `DandisetListItem` (unchanged behaviour)                                                                     |
| `lib/errors.ts`                                                                                            | `ApiError`; `friendlyError(e, CLIP_EXTRACTOR_MESSAGES)` with the app's 403 wording                                                                      |
| `lib/dandisets.ts`                                                                                         | `listIncomingDandisets` (same `{ datasets, unverified }` shape)                                                                                         |
| `lib/humanSubjects.ts`, `lib/users.ts`                                                                     | same names from ember-client                                                                                                                            |
| `lib/etag.ts`                                                                                              | `planParts`, `hashPart`, `combineDigests`, `computeDandiEtag`, `computeMd5`; keep `computeSha256` in the app (its hash-wasm dependency stays app-local) |
| `lib/interrupt.ts`                                                                                         | `InterruptedError`, `isInterruption`, `throwIfInterrupted` from utils                                                                                   |
| `lib/queue.ts`                                                                                             | `runQueue` from utils                                                                                                                                   |
| `lib/sanitize.ts`                                                                                          | `sanitizeSegment(s, fallback, { whitespaceAs: "+", extraAllowed: "+" })`, `verbatimFilename`, `foldDiacritics`                                          |
| `lib/format.ts`: `bytes`, `initialsFrom`                                                                   | same names from utils; `fmtTime`, `rulerStep`, `rulerLabel` stay (timeline-specific)                                                                    |
| `lib/settings.ts`                                                                                          | `createArchiveSettingsStore<StoredSettings>(STORAGE_KEY)` plus `resolveConfig`                                                                          |
| `lib/types.ts`: archive and upload types                                                                   | `ArchiveConfig`, `OAuthTokenSet`, `FilePart`, `ServerPart`, `UploadInitResponse`, `CompletedPart`, `Asset` from ember-client                            |
| `tests/integration/layout.ts`                                                                              | `@brain-bbqs/test-utils/playwright`                                                                                                                     |
| `tests/chromatic/app.chromatic.test.ts` loop                                                               | `forEachViewport(test, "Main page - default (no video loaded)", ...)`                                                                                   |
| the sign-in half of `tests/integration/helpers.ts` (`stubArchive`'s `addInitScript` and admin-check route) | `seedSignedIn(page, { storageKey: STORAGE_KEY, extraSettings: { deliveryMode: "upload" } })`; the S3 and assets routes stay                             |

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
| `tests/integration/helpers/layout.ts`, `theme.ts`, `auth.ts`                        | `@brain-bbqs/test-utils/playwright` (`seedSignedIn` takes `storageKey: STORAGE_KEY`; keep the app-specific assets-listing route beside it)               |
| the `jsonResponse`/`stubFetch` helpers in unit tests, the `Storage.prototype` spies | `@brain-bbqs/test-utils/vitest`                                                                                                                          |

## encoding-helper

| Delete                                            | Replace with                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `lib/format.ts`: `fmtBytes`, `errorMessage`       | same names from utils; the duration/bitrate/rate helpers stay                                    |
| `tests/integration/layout.ts`, the Chromatic loop | `@brain-bbqs/test-utils/playwright`                                                              |
| `stories/utils.ts`                                | copy of `packages/ui/stories/utils.ts` is fine to keep; `storybookPreview` replaces `preview.ts` |

## @brain-bbqs/ui (step 4, in two pull requests per app)

Each app adopts the shell in two pull requests, so Chromatic judges the stylesheet on its own:

- **4a, stylesheet and markup.** The `@import`, the deleted blocks, the few rules the app keeps,
  and the class changes in `index.html`. No TypeScript changes.
- **4b, behaviour helpers.** The theme toggle, auth rendering, identity, human-subjects gate,
  dropzone plumbing and element lookups, from `@brain-bbqs/ui`. No stylesheet or markup changes.

Each recipe below was checked in Chromium against the app's `main` page, before and after: every
element's computed style and box at seven widths from 375px to 1600px, in light, dark, OS-dark,
the signed-in pre-paint state and a dragover state, plus the hover colours of every visible
button and link. No box moved. The only computed values that differ are ones that cannot render:
grid placement on an `<img>` that is not a grid item, `align-items` on a single-child `.dz-icon`,
the fade moving from a lone footer mark's image to its link, and the colour of clip-extractor's
plain `.badge` while it is hidden (it is only ever shown as `badge ok`).

What the tables do not show:

- **Keep a rule where it is.** A rule the app keeps stays at its place in the app's stylesheet
  rather than moving to the end, since some tie with later app rules on specificity and win on
  order: clip-extractor's `button:hover:not(:disabled)` has to stay ahead of `.seg button.active`,
  or the active segment tints on hover.
- **The `@import` comes first.** CSS allows `@import` only at the top of a stylesheet, so the
  app's own `:root` blocks always follow it and override the shared palette; there is no
  "import after the app's tokens".
- **Knobs are custom properties on `:root`** (the ui README lists them). They are read with a
  fallback, so setting one never needs `tokens.css`.
- **Shared values follow the majority, ties to the template**, so a freshly generated app needs no
  overrides. Where an app is the odd one out it keeps or redeclares the listed rules. Only two
  undo a shared rule: bbqs-uploader's phone header, which never restacked, and clip-extractor's
  Talmo Lab lockup, which fades its mark and its name separately.
- **Nothing rendered changes.** The Chromatic baselines should come out the same on both pull
  requests; a difference is a missed option in the package, to be fixed there first.

### clip-extractor

**4a.** `@import "@brain-bbqs/ui/styles/index.css";` at the top of `src/style.css`.

| Delete from `style.css`                                                                                                                                                                                                                      | Keep or add after the import                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the three token blocks                                                                                                                                                                                                                       | `:root { --stage-bg: #000; --page-max-width: 960px; --page-padding: 1.5rem 1rem 3rem; --code-font: var(--mono); --button-primary-disabled: var(--accent); --footer-bar-padding: 0 0.5rem 0.15rem 0.5rem; --footer-brand-height: 4rem; }` and, in both dark blocks, `--warn-soft: #3a2f14; --err-soft: #3a1d1d;`                                                                    |
| `*`, `[hidden]`, `body`, `main`, `a`, `code`, the focus-ring rule                                                                                                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                    |
| `.site-header`, `.brand-logo`, `.brand-watermark-*`, `header h1`, `.site-title`, `.site-subtitle`, `.header-actions`, the theme toggle's rules                                                                                               | the whole `@media (max-width: 640px)` header block (the shared one restacks at 600px)                                                                                                                                                                                                                                                                                              |
| the four `#oauthSigninBtn` rules, `#oauthSignedIn[hidden]`, every `.oauth-*` rule                                                                                                                                                            | `:root[data-signed-in="1"] #deliverToggleRow[hidden]`                                                                                                                                                                                                                                                                                                                              |
| `.card`, `.card-heading`, `.card-heading h2`, `button`, `button.primary`, `button:disabled`, `button.small`, `button.ghost`, `select`, `.hint`, `.hint.ok`, `.hint.err`, `.badge`, `.badge.ok`, `.badge.restricted`                          | `button { white-space: nowrap; }`, and `button:hover:not(:disabled)` and `button.primary:hover:not(:disabled)` where they are; `.hint.stopped`; `#dandisetId`                                                                                                                                                                                                                      |
| the dropzone block (`.dropzone` through `.dz-browse:hover`), `.view-dataset-link` and its two states, `.dandiset-single`, `.dandiset-embargo-error`, the seven `.human-subjects-*` rules, `.progress`, `.progress-fill`, `.progress-fill.ok` | `.progress { margin-top: 0.75rem; }`                                                                                                                                                                                                                                                                                                                                               |
| the footer rules (`.page-footer-bar` through `.talmo-brand-link span`) and the `@media (max-width: 1400px)` block                                                                                                                            | the captioned Talmo Lab lockup: `.footer-brand-link.captioned { gap: 0.2rem; opacity: 1; }`, `.footer-brand-link.captioned .footer-brand-logo { width: 2.7rem; height: 2.7rem; opacity: 0.312; }`, `.footer-brand-link.captioned .footer-brand-name { color: var(--muted); font-size: 0.7rem; line-height: inherit; letter-spacing: 0.02em; white-space: normal; opacity: 0.45; }` |

Markup: `class="primary oauth-signin-btn"` on `#oauthSigninBtn`; the Talmo Lab link becomes
`class="footer-brand-link captioned" aria-label="Talmo Lab"`, its images
`footer-brand-logo on-light`/`on-dark` and its `<span>` `footer-brand-name`; the CON link becomes
`footer-brand-link` and its image `footer-brand-logo` (`html/page-footer.html` is the reference).

**4b.**

| Delete                                                     | Replace with                                                                                                                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/connection.ts`                                         | `refreshIdentity(shell.account, () => fetchArchiveUser(cfg))`, which resolves to the user the provenance record names                                                                                          |
| `ui/elements.ts`: `required` and the header/footer entries | `required` and `getShellElements()` (the default ids are this app's); the player entries stay                                                                                                                  |
| the theme toggle block in `main.ts`                        | `initThemeToggle(shell.themeToggle, { storageKey: THEME_KEY })`, which keeps the "Could not save theme preference:" warning                                                                                    |
| `els.versionIndicator.textContent = ...`                   | `renderVersion(shell.versionIndicator, __APP_VERSION__)`                                                                                                                                                       |
| `renderAuthUI`'s hide/show and `delete dataset.signedIn`   | `renderAuthState(shell.account, isSignedIn())`; the delivery-toggle line stays                                                                                                                                 |
| the human-subjects confirmed set and its click handler     | `createHumanSubjectsGate(els, onChange)`, calling `gate.render(els.dandisetId.value, humanSubjectsRequired && ...)` where the banner was drawn; `onChange` runs `blurTool.render()` and `updateDeliveryGate()` |
| `wireDropzone` and the click/change/window listeners       | `bindDropzone(els.dropzone, { onDrop, input: els.videoFile, browseButton: els.browseVideoBtn, onPick })` and the same for `slpDropzone` with `guardWindow: false`                                              |

### bbqs-uploader

**4a.** `@import "@brain-bbqs/ui/styles/index.css";` at the top of `src/style.css`.

| Delete from `style.css`                                                                                                                                                   | Keep or add after the import                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| the three token blocks, `*`, `[hidden]`, `body`, `main`, `a`, `code`, the focus-ring rule                                                                                 | nothing: the shared palette and knob defaults are this app's                                                                                                                                                                               |
| `.site-header`, `.site-header > a:has(.header-logo)`, `.header-logo`, `.brand-watermark-*`, `header h1`, `.site-subtitle`, `.oauth-row`, the theme toggle's rules         | `@media (max-width: 600px) { .site-header { grid-template-columns: 1fr auto 1fr; } .header-logo-link, .header-actions, .site-header > h1 { grid-column: auto; grid-row: auto; } }`: this header does not restack on a phone, the others do |
| the three `#oauth-signin-btn` rules, its `data-signed-in` rule, `#oauth-signed-in[hidden]`, every `.oauth-*` rule                                                         | `:root[data-signed-in="1"] #folder-card[hidden]`                                                                                                                                                                                           |
| `.card`, `.card h2`, `.card-heading`, `.card-heading h2`, `select`, `button`, `button.primary`, `button:disabled`, `button.primary:disabled`, `.badge` and its five kinds | `.badge.mute`, `.grid`                                                                                                                                                                                                                     |
| `#dropzone`, `#dropzone.dragover`, `.dz-icon`, `.dz-inner p`, `.dz-browse`, `.dz-hint`, `.dz-inner .dz-reject`                                                            |                                                                                                                                                                                                                                            |
| `.view-dataset-link` and its two states, `.dandiset-single`, `.dandiset-embargo-error`, the seven `.human-subjects-*` rules                                               | `.btn-arrow`, `.load-remote-btn`, and the combined `.view-dataset-link, .load-remote-btn` padding rule                                                                                                                                     |
| `.page-footer-bar` through `.version-link`, `.footer-dot`, `.con-brand-link img`, the `@media (max-width: 1400px)` block                                                  | `.whats-new-link` and the What's New modal; the Clear checksum cache button keeps `whats-new-link` too, since `.footer-button-link:disabled` would grey it while it is disabled; its own `.progress` rules, which draw a different bar     |

Markup: `class="primary oauth-signin-btn"` on `#oauth-signin-btn`; `class="header-logo-link"` on
the header's logo link; `.oauth-row` becomes `class="header-actions"`; `class="dropzone"` on
`#dropzone`; the CON link becomes `footer-brand-link` inside a new `<div class="footer-brands">`,
its image `footer-brand-logo`.

**4b.**

| Delete                                                                           | Replace with                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/connection.ts`                                                               | `refreshIdentity(shell.account, () => fetchArchiveUser(cfg))`                                                                                                                                                                 |
| `ui/elements.ts`: `required` and the shell entries                               | `getShellElements({ themeToggle: "theme-toggle", oauthSigninBtn: "oauth-signin-btn", oauthSignedIn: "oauth-signed-in", oauthAvatar: "oauth-avatar", oauthUsername: "oauth-username", oauthSignoutBtn: "oauth-signout-btn" })` |
| the theme toggle block, `saveStoredTheme`/`loadStoredTheme`                      | `initThemeToggle(shell.themeToggle, { storageKey: THEME_KEY })`                                                                                                                                                               |
| `els.versionIndicator.textContent = ...`                                         | `renderVersion(shell.versionIndicator, __APP_VERSION__)`                                                                                                                                                                      |
| `renderAuthUI`'s first two lines and `delete dataset.signedIn`                   | `renderAuthState(shell.account, isSignedIn())`; the visibility updates stay                                                                                                                                                   |
| the human-subjects confirmed set and its click handler                           | `createHumanSubjectsGate(els, onChange)`, calling `gate.render(els.dandisetId.value, humanSubjectsRequired && !!els.dandisetId.value)`; `humanSubjectsUnconfirmed()` becomes `gate.isBlocking(...)`                           |
| `ui/dropzone.ts`: `showReject`, the drag/click/change listeners and window guard | `showDropzoneReject(els.dropzoneReject, message)` and `bindDropzone(els.dropzone, { onDrop, input: els.folderInput, browseButton: els.browseFolderBtn, onPick })`; the folder walk and messages stay                          |

### encoding-helper

**4a.** `@import "@brain-bbqs/ui/styles/shell.css";` at the top of `src/style.css`, and nothing
else from the package: its own palette, `body` layout and controls stay, and `shell.css` reads
only tokens that palette defines.

| Delete from `style.css`                                                                                                                                                    | Keep or add after the import                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.site-header`, `.site-header h1`, `.brand-logo`, `.brand-watermark-*`, `.header-actions`, the theme toggle's rules (with `:focus-visible`)                                | `:root { --site-title-size: 2em; --footer-bar-padding: 0 0.75rem 0.35rem 0.5rem; --footer-brand-height: 60px; }`, `.site-header { gap: 12px; }`, `.brand-watermark-link { top: 2px; left: 6px; }`; its own `h1` and `.subtitle` |
| the four header rules inside `@media (max-width: 600px)`                                                                                                                   | the rest of that block                                                                                                                                                                                                          |
| `.page-footer-bar` through `.footer-button-link:disabled`, `.footer-brands`, `.footer-brands > a`, `.footer-brands img`, `.con-brand-link img`, the `.talmo-brand-*` rules | `.footer-brands { gap: 12px; }`, and the whole `@media (max-width: 1560px)` block, which takes the footer out of fixed positioning earlier than the shared 1400px                                                               |

Markup: the Talmo Lab link becomes `footer-brand-link captioned`, its images
`footer-brand-logo on-light`/`on-dark` and `.talmo-brand-name` `footer-brand-name`; the CON link
becomes `footer-brand-link` and its image `footer-brand-logo`.

**4b.**

| Delete                                                                                        | Replace with                                                                                                                    |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `lib/dom.ts`: `h`, `button`, `svgEl`, `svgText`, `escapeHtml`, `resetIcon`, `copyToClipboard` | same names from ui; `gridItem`, `infoIcon`, `teachBox`, `fold`, `dataTable`, `cmdBlock` stay (they read the educational toggle) |
| the theme toggle block in `main.ts`                                                           | `initThemeToggle(els.themeToggle, { storageKey: THEME_KEY })`                                                                   |
| `els.versionIndicator.textContent = ...`                                                      | `renderVersion(els.versionIndicator, __APP_VERSION__)`                                                                          |
| `ui/elements.ts`: `required`                                                                  | `required` from ui (`getShellElements()` also fits: default ids, and `account` is null)                                         |

### The web-app template

It has the theme toggle, watermark, header and footer, but no account menu, human-subjects banner,
dataset picker, `.site-title` block or captioned mark; its only footer mark is CON, and its
dropzone is drawn its own way (a muted zone that also highlights on hover, a plain red reject
line), so it skips `dropzone.css`.

**4a.** At the top of `src/style.css`:

```css
@import "@brain-bbqs/ui/styles/tokens.css";
@import "@brain-bbqs/ui/styles/base.css";
@import "@brain-bbqs/ui/styles/shell.css";
@import "@brain-bbqs/ui/styles/controls.css";
@import "@brain-bbqs/ui/styles/dataset-picker.css";
@import "@brain-bbqs/ui/styles/human-subjects.css";
```

| Delete from `style.css`                                                                                                                                                | Keep                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| the three token blocks, `*`, `[hidden]`, `body`, `main`, `a`, `code`, the focus-ring rule                                                                              | `.card-note`, `.file-summary*`                    |
| `.site-header`, `.site-header > a:has(.header-logo)`, `.header-logo`, `header h1`, `.header-actions`, `.brand-watermark-*`, `.site-subtitle`, the theme toggle's rules | the dropzone rules and their reduced-motion block |
| `.card`, `.card h2`, `.card-heading`, `.card-heading h2`, `button`, `button.primary`, `button:disabled`, `button.primary:disabled`                                     |                                                   |
| `.page-footer-bar` through `.version-link`, `.footer-dot`, `.con-brand-link img`, the `@media (max-width: 600px)` and `@media (max-width: 1400px)` blocks              | `.whats-new-link` and the What's New modal        |

Markup: `class="header-logo-link"` on the header's logo link; the CON link becomes
`footer-brand-link` inside a new `<div class="footer-brands">`, its image `footer-brand-logo`.

**4b.** `getShellElements({ themeToggle: "theme-toggle" })` (`account` is null),
`initThemeToggle(shell.themeToggle, { storageKey: THEME_KEY })` in place of the toggle block and
`saveStoredTheme`, `renderVersion(...)`, and in `ui/dropzone.ts` `showDropzoneReject` plus
`bindDropzone(els.dropzone, { onDrop, input: els.fileInput, browseButton: els.browseFileBtn, onPick })`.

## Order of operations

1. `@brain-bbqs/config` first: it changes no runtime code, and the diff is the deleted `configs/`.
2. `@brain-bbqs/utils` and `@brain-bbqs/test-utils`: pure functions and test scaffolding, one PR.
3. `@brain-bbqs/ember-client`: the app's unit tests for the deleted modules move with them; what
   remains are the app's tests of its own `main.ts`.
4. `@brain-bbqs/ui` last, in two pull requests per app (see its section above): 4a, the stylesheet
   import and the markup's new classes, where Chromatic shows any drift on its own; then 4b, the
   behaviour helpers, which change no pixel.
