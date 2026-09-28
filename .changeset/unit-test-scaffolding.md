---
"@brain-bbqs/test-utils": minor
---

Added the unit-test scaffolding the apps each carried their own copy of, to `@brain-bbqs/test-utils/vitest`: `createMainHarness` (boots an app's real `main.ts` against its real `index.html`, with storage emptied per test file, a recording offline `fetch`, `matchMedia` and `<dialog>` stand-ins, and optional canvas and observer stubs), `el`, `fakeFile` and `pickFiles`; `readIdContract` and `expectIdContract`, which check the `index.html`/`elements.ts` id contract both ways; `offlineFetch`; and the jsdom stand-ins `installMatchMedia`, `installDialogPolyfill` (Escape included), `installObserverStub`, `stubClipboard`, `installExecCommand` and `installCanvasStub`. Minor because it only adds exports.
