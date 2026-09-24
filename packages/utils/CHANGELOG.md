# @brain-bbqs/utils

## 0.2.0

### Minor Changes

- 40f1b85: Fixes from adopting utils and test-utils in the apps: `bytes` and `fmtBytes` print a sub-KB count exactly as given and send NaN to their top unit, as the apps' own formatters did (new `exactBytes` option on `formatBytes`); `createChoiceStore` and `createFlagStore` take an `onError` so an app keeps its own warning; `bodyOf` takes `stripScripts`; the shared Playwright preview runs with `--strictPort`, so a busy port fails instead of silently testing another app.

## 0.1.0

### Minor Changes

- 096309f: First release: the tooling configs, EMBER archive client, page shell, utilities and test helpers
  that clip-extractor, encoding-helper and bbqs-uploader each carried a copy of, generalized into
  independently versioned packages.
