# @brain-bbqs/ember-client

## 0.2.0

### Minor Changes

- fd45b70: `createEtag({ emptyFile, tooLarge, fileChanged })` returns the hashing functions with an app's own error wording, plus `readChunks`, the chunked reader they share, for an app's own digest; the top-level `planParts`, `hashPart`, `computeDandiEtag` and `computeMd5` are unchanged. `OAuthClient`'s members are typed as function properties so an app can destructure them.

## 0.1.1

### Patch Changes

- Updated dependencies [40f1b85]
  - @brain-bbqs/utils@0.2.0

## 0.1.0

### Minor Changes

- 096309f: First release: the tooling configs, EMBER archive client, page shell, utilities and test helpers
  that clip-extractor, encoding-helper and bbqs-uploader each carried a copy of, generalized into
  independently versioned packages.

### Patch Changes

- Updated dependencies [096309f]
  - @brain-bbqs/utils@0.1.0
