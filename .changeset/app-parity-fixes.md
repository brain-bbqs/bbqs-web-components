---
"@brain-bbqs/utils": minor
"@brain-bbqs/test-utils": minor
"@brain-bbqs/config": patch
---

Fixes from adopting utils and test-utils in the apps: `bytes` and `fmtBytes` print a sub-KB count exactly as given and send NaN to their top unit, as the apps' own formatters did (new `exactBytes` option on `formatBytes`); `createChoiceStore` and `createFlagStore` take an `onError` so an app keeps its own warning; `bodyOf` takes `stripScripts`; the shared Playwright preview runs with `--strictPort`, so a busy port fails instead of silently testing another app.
