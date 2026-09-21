# @brain-bbqs/utils

Framework-free helpers the BBQS companion apps each carried a copy of.

```sh
npm install @brain-bbqs/utils
```

| Export                                                                                           | Was                                                                                 |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `formatBytes`, `bytes`, `fmtBytes`, `humanSize`                                                  | `src/lib/format.ts` in clip-extractor, encoding-helper and bbqs-uploader (one each) |
| `initialsFrom`, `friendlyEta`, `bytesPerSecToMBps`, `errorMessage`                               | `src/lib/format.ts` (clip-extractor, bbqs-uploader, encoding-helper)                |
| `runQueue`                                                                                       | `src/lib/queue.ts` (clip-extractor, bbqs-uploader)                                  |
| `sanitizeSegment`, `sanitizeFilename`, `sanitizePath`, `verbatimFilename`, `foldDiacritics`      | `src/lib/sanitize.ts` (clip-extractor, bbqs-uploader)                               |
| `InterruptedError`, `isInterruption`, `throwIfInterrupted`                                       | `src/lib/interrupt.ts` (clip-extractor)                                             |
| `createJsonStore`, `createChoiceStore`, `createFlagStore`, `readStorageItem`, `writeStorageItem` | the try/catch around every localStorage key in `src/lib/settings.ts` and `main.ts`  |

The three byte formatters differ on purpose (each app's readouts are tested to the string), so all
three presets are kept and `formatBytes` is the one implementation under them.

`sanitizeSegment` defaults to bbqs-uploader's rules; clip-extractor passes
`{ whitespaceAs: "+", extraAllowed: "+" }` to keep the `range-<in>+<out>` entity it generates.
