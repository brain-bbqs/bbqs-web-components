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
import { createMainHarness, expectIdContract, readIndexHtml, routeFetch } from "@brain-bbqs/test-utils/vitest";
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

| Export                                                       | Was                                                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `readIndexHtml`, `bodyOf`, `mountHtml`                       | the top of every `tests/unit/elements.test.ts`                                          |
| `jsonResponse`, `textResponse`, `routeFetch`, `offlineFetch` | the `jsonResponse`/`stubFetch` helpers, and the "network disabled in tests" fetch stubs |
| `throwingStorage()`                                          | the `Storage.prototype` spies in `settings.test.ts`                                     |
| `createMainHarness`, `el`, `fakeFile`, `pickFiles`           | bbqs-uploader's and the template's `tests/unit/helpers/mainHarness.ts`                  |
| `readIdContract`, `expectIdContract`                         | the elements tests, now checked both ways                                               |
| `installMatchMedia`, `installDialogPolyfill`                 | the matchMedia stub and `<dialog>` stand-in in both harnesses                           |
| `installObserverStub`, `stubClipboard`, `installExecCommand` | encoding-helper's fake Resize/IntersectionObservers and clipboard stubs                 |
| `installCanvasStub`                                          | nothing yet: the 2D context clip-extractor's `main.ts` needs to boot at all             |

Each `install*`/`stub*` returns (or carries) a function putting back what was there, and none
imports Vitest's `vi`: hand in a `vi.fn` where a test asserts on calls.

### Booting `main.ts`

One test file per boot scenario, since a file's module registry runs `main.ts`'s top-level wiring
once. The app creates its harness once, in `tests/unit/helpers/mainHarness.ts`; the import stays
in the app's own code so Vitest transforms it and the test file's `vi.mock` calls apply to it:

```ts
// tests/unit/helpers/mainHarness.ts
import { createMainHarness } from "@brain-bbqs/test-utils/vitest";

export const { bootMain } = createMainHarness({ importMain: () => import("../../../src/main") });
export { el } from "@brain-bbqs/test-utils/vitest";
```

```ts
// tests/unit/main.mock-file.test.ts
// @vitest-environment jsdom
beforeAll(async () => {
  await bootMain("?test&mock_file"); // or { url, localStorage, sessionStorage, fetch, matchMedia, beforeImport }
});
```

Creating the harness empties `localStorage` and `sessionStorage` and notes the environment's
`fetch`, both while the test file is still importing, so whatever the file's own setup stores or
stubs before `bootMain()` stays. `bootMain` then sets the URL, mounts `index.html`'s body without
its scripts, seeds the storage it is given, installs a `fetch` that fails every call (unless the
test stubbed its own), a light-theme `matchMedia` and the `<dialog>` stand-in, and imports
`main.ts`; it resolves to `{ module, fetch, canvas, observers }`, and a second call throws. An app
that draws or observes at boot creates the harness with `canvas: true` and
`observers: ["ResizeObserver"]` (clip-extractor).

### The id contract

```ts
// tests/unit/elements.test.ts
// @vitest-environment jsdom
it("index.html and the element lookups agree", () => {
  expectIdContract({ html: readIndexHtml(), lookups: [getShell, getElements] });
});
```

Every id a lookup requires must be in the page (the error names the lookup's own message), and
every id in the page must be registered by a lookup, whether it asks `getElementById` for it or
hands back an element carrying it. Ids the page points at itself (a label's `for`, `aria-*`,
`href="#id"`, `url(#id)`) count as registered; `pageOnly` exempts a styling hook. `readIdContract`
returns the same findings without asserting, including which ids are `required` and which the
lookups tolerate missing (`optional`).

The Playwright helpers are exercised in a real browser by `tests/integration/` here; the Vitest
helpers by `tests/unit/`.
