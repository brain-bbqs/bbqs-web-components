# @brain-bbqs/test-utils

The test scaffolding the BBQS companion apps each carried a copy of. Two entry points, so an app's
unit tests never pull Playwright in:

```ts
import {
  VIEWPORTS,
  expectNoHorizontalOverflow,
  forEachViewport,
  seedSignedIn,
  seedTheme,
} from "@brain-bbqs/test-utils/playwright";
import { mountHtml, readIndexHtml, jsonResponse, routeFetch, throwingStorage } from "@brain-bbqs/test-utils/vitest";
```

```sh
npm install --save-dev @brain-bbqs/test-utils
```

## Playwright

| Export                                                                                         | Was                                                                      |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `VIEWPORTS`, `expectNoHorizontalOverflow`                                                      | `tests/integration/layout.ts` (three identical copies)                   |
| `forEachViewport(test, title, body)`                                                           | the `for (const viewport of VIEWPORTS)` loop in `tests/chromatic/*`      |
| `seedSignedIn`, `stubIncomingDandisets`, `stubAdminCheck`, `stubDraftMetadata`, `stubIdentity` | `tests/integration/helpers/auth.ts` and the archive half of `helpers.ts` |
| `seedTheme`                                                                                    | `tests/integration/helpers/theme.ts`                                     |

`seedSignedIn` takes the app's settings key rather than importing it, so the package does not
depend on any app. The Chromatic pattern becomes:

```ts
import { test, expect } from "@chromatic-com/playwright";
import { expectNoHorizontalOverflow, forEachViewport } from "@brain-bbqs/test-utils/playwright";

forEachViewport(test, "Main page - default", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Clip Extractor");
  await expectNoHorizontalOverflow(page);
});
```

## Vitest

| Export                                       | Was                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `readIndexHtml`, `bodyOf`, `mountHtml`       | the top of every `tests/unit/elements.test.ts`                                          |
| `jsonResponse`, `textResponse`, `routeFetch` | the `jsonResponse`/`stubFetch` helpers at the top of the api, oauth and dandisets tests |
| `throwingStorage()`                          | the `Storage.prototype` spies in `settings.test.ts`                                     |

The Playwright helpers are exercised in a real browser by `tests/integration/` here; the Vitest
helpers by `tests/unit/`.
