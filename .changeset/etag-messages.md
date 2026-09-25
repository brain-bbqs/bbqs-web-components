---
"@brain-bbqs/ember-client": minor
---

`createEtag({ emptyFile, tooLarge, fileChanged })` returns the hashing functions with an app's own error wording, plus `readChunks`, the chunked reader they share, for an app's own digest; the top-level `planParts`, `hashPart`, `computeDandiEtag` and `computeMd5` are unchanged. `OAuthClient`'s members are typed as function properties so an app can destructure them.
