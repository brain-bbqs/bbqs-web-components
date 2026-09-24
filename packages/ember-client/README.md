# @brain-bbqs/ember-client

The browser-side EMBER (DANDI) archive client that clip-extractor and bbqs-uploader each carried a
copy of under `src/lib/`. Backend-free by design: the browser runs the whole PKCE flow and talks to
the archive's REST API and S3 directly.

```sh
npm install @brain-bbqs/ember-client
```

| Export                                                                      | Was                                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------- |
| `EMBER_INSTANCE`, `ADMIN_CHECK_BASE_URL`, `DandiInstance`                   | `lib/instances.ts`                                  |
| `ArchiveConfig`, `OAuthTokenSet`, `FilePart`, `ServerPart`, `Asset`, ...    | `lib/types.ts` (`UploaderConfig` in bbqs-uploader)  |
| `apiFetch`, `listedTitle`, `nextPagePath`, `diagnoseCors`                   | `lib/api.ts`                                        |
| `ApiError`, `friendlyError`                                                 | `lib/errors.ts`                                     |
| `createOAuthClient`                                                         | `lib/oauth.ts`                                      |
| `fetchArchiveUser`                                                          | `lib/users.ts` (clip-extractor), `ui/connection.ts` |
| `listIncomingDandisets`                                                     | `lib/dandisets.ts`                                  |
| `HUMAN_SUBJECTS_PHRASE`, `containsHumanSubjects`, `fetchDraftMetadata`      | `lib/humanSubjects.ts`                              |
| `planParts`, `hashPart`, `combineDigests`, `computeDandiEtag`, `computeMd5` | `lib/etag.ts`                                       |
| `resolveConfig`, `configProblems`, `createArchiveSettingsStore`             | `lib/settings.ts`                                   |

## What each app keeps

- **Its OAuth client id.** Each app is a separate public OAuth2 application on the archive so the
  tools can be revoked and audited independently:

  ```ts
  export const oauth = createOAuthClient({
    clientId: "KoQNdyPaJULkfRJXa9YSm6PTC29TLzEz8yZH3vNv",
    storageKey: "bbqs-uploader.oauth-pkce.v1",
  });
  ```

- **Its storage keys.** `createArchiveSettingsStore("bbqs-uploader.settings.v1")` keeps the key
  where the pre-paint script (`@brain-bbqs/config/pre-paint`) and the tests can read it.

- **Its wording.** `friendlyError(e, { 403: "Permission denied: your account cannot add assets to this dataset." })`
  overrides any of the 401/403/404 messages.

## Behaviour merged from the two copies

- `apiFetch` omits the `Authorization` header when there is no token (clip-extractor's fix), so an
  anonymous call reaches public endpoints as a real anonymous request.
- `listIncomingDandisets` returns `{ datasets, unverified }` (clip-extractor's shape), so a UI can
  say "couldn't verify" instead of "you have no datasets" when the admin-check service is down.
  bbqs-uploader destructures `.datasets`.
- Every hash takes an optional `AbortSignal` (clip-extractor's interruption), read at each 16MB
  chunk boundary. bbqs-uploader's worker pool keeps calling `hashPart` per part and
  `combineDigests` at the end.
- `sanitize` helpers moved to `@brain-bbqs/utils`; nothing here touches the DOM.
