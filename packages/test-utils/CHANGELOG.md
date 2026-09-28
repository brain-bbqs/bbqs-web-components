# @brain-bbqs/test-utils

## 0.3.0

### Minor Changes

- 11b1078: Added the unit-test scaffolding the apps each carried their own copy of, to `@brain-bbqs/test-utils/vitest`: `createMainHarness` (boots an app's real `main.ts` against its real `index.html`, with storage emptied per test file, a recording offline `fetch`, `matchMedia` and `<dialog>` stand-ins, and optional canvas and observer stubs), `el`, `fakeFile` and `pickFiles`; `readIdContract` and `expectIdContract`, which check the `index.html`/`elements.ts` id contract both ways; `offlineFetch`; and the jsdom stand-ins `installMatchMedia`, `installDialogPolyfill` (Escape included), `installObserverStub`, `stubClipboard`, `installExecCommand` and `installCanvasStub`. Minor because it only adds exports.

## 0.2.1

### Patch Changes

- Updated dependencies [fd45b70]
  - @brain-bbqs/ember-client@0.2.0

## 0.2.0

### Minor Changes

- 40f1b85: Fixes from adopting utils and test-utils in the apps: `bytes` and `fmtBytes` print a sub-KB count exactly as given and send NaN to their top unit, as the apps' own formatters did (new `exactBytes` option on `formatBytes`); `createChoiceStore` and `createFlagStore` take an `onError` so an app keeps its own warning; `bodyOf` takes `stripScripts`; the shared Playwright preview runs with `--strictPort`, so a busy port fails instead of silently testing another app.

### Patch Changes

- @brain-bbqs/ember-client@0.1.1

## 0.1.0

### Minor Changes

- 096309f: First release: the tooling configs, EMBER archive client, page shell, utilities and test helpers
  that clip-extractor, encoding-helper and bbqs-uploader each carried a copy of, generalized into
  independently versioned packages.

### Patch Changes

- Updated dependencies [096309f]
  - @brain-bbqs/ember-client@0.1.0
