# How the packages are vendored, and recommendations

## What this repository does

- **One repo, five packages, independent versions.** npm workspaces, each package with its own
  `package.json`, tests, coverage floor and `CHANGELOG.md`. A change to the archive client does not
  bump the UI shell.
- **Published to the public npm registry under `@brain-bbqs/`.** The apps depend on them like any
  other dependency: `npm install @brain-bbqs/ui`, a version range in `package.json`, and
  `package-lock.json` pinning the exact build. No git submodules, no copied files, nothing to keep
  in sync by hand.
- **Changesets for versioning.** A PR declares its bump in `.changeset/*.md`; the release workflow
  opens a "Version Packages" PR, and merging that publishes. Nobody edits a version field.
- **Provenance.** `npm publish --provenance` from GitHub Actions attaches a signed attestation
  linking each published tarball to the commit and workflow that built it.
- **Source-first inside the repo, dist-first outside.** In-repo, `paths` and Vite aliases resolve
  `@brain-bbqs/*` to sibling source so tests need no build; the published packages ship compiled
  ESM with declarations and source maps (`tsconfig.build.json` per package, `tsc -b` in order).

## Recommendations

1. **Publishing uses npm trusted publishing.** Each package on npmjs.com trusts
   `.github/workflows/release.yml` in this repository, so a release needs no npm token or secret:
   npm exchanges the job's OIDC token for a short-lived one. npm configures a trusted publisher per
   existing package, so a brand-new package is published once by hand and then trusted, before CI
   can release it.

2. **Pin in the apps with caret ranges and let Dependabot bump.** `"@brain-bbqs/ui": "^0.1.0"` plus
   the apps' existing Dependabot config (add an `npm` ecosystem entry grouped on `@brain-bbqs/*`)
   gives each app a reviewable PR per shared release, with its own Chromatic diff. This is the main
   reason to publish rather than to point apps at a git branch: a shared change never lands in an
   app without that app's own CI seeing it.

3. **Local development against an unreleased change.** From an app checkout,
   `npm link ../bbqs-web-components/packages/ui` after `npm run build` there, or a
   `"@brain-bbqs/ui": "file:../bbqs-web-components/packages/ui"` override while iterating.
   For a preview build that others can install, `npx changeset pre enter next` on a branch publishes
   `0.2.0-next.0` style versions without touching the stable line.

4. **Keep app identity in the apps.** OAuth client ids, storage keys, repository URLs, logos and the
   exact wording of user-facing strings are parameters to these packages, never defaults baked into
   them. That is what lets one package serve tools that must be revocable and auditable
   independently.

5. **Grow the packages from the apps, not ahead of them.** The rule used here: something moves into
   a package once two apps carry it. Candidates already visible for a later round, once a second app
   needs them: bbqs-uploader's `checksum-cache.ts` (IndexedDB digest cache) and `s3-upload.ts` /
   clip-extractor's `s3.ts` + `upload.ts` (the multipart upload driver; the two differ in
   cancellation and retry and want a design pass first), clip-extractor's `linkify.ts`, and
   encoding-helper's `fileLoading.ts` URL-loading path.

6. **One CSS contract.** The shared stylesheet selects on classes only and the apps own ids, so an
   app can rename an element without touching the package. Adoption adds a few class names where an
   app had used an id or its own name (`oauth-signin-btn`, `header-logo-link`, `header-actions`,
   `dropzone`, the `footer-brand-*` set; the ui README lists them); anything else the shared CSS
   needs from markup should be added the same way, with the `html/` reference fragment and the
   builder updated together (the ui tests assert the two agree). Where the apps' values
   legitimately differ, the rule reads a knob (a custom property with the shared default as its
   fallback) rather than growing an app-specific class.

7. **Storybook and Chromatic per package, not per app.** The ui package's stories are the visual
   contract for the shell; the apps' Chromatic runs then only need to cover what is theirs. Wire the
   `CHROMATIC_STORYBOOK_PROJECT_TOKEN` secret for this repository to turn `chromatic.yml` on.

8. **Security guidance stays with the code that stores credentials.** The apps' `SECURITY.md`
   documents the clear-text-storage trade-off; `createArchiveSettingsStore` carries the same
   `codeql[...]` marker and a pointer back. If CodeQL runs on the apps against the installed
   package, the alert lands on the app's call site, which is where the documented decision lives.

## Alternatives considered

| Pattern                                                         | Why not                                                                                                                                                        |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git submodule of this repo in each app                          | Pins a commit rather than a version, no changelog, breaks `npm ci` caching, and Vite would compile the shared TypeScript with each app's settings              |
| `"@brain-bbqs/ui": "github:brain-bbqs/bbqs-web-components#..."` | npm cannot install a subdirectory of a git repo, so this would need one repo per package; loses Dependabot version ranges and provenance                       |
| Copy-and-diff (the status quo)                                  | The three copies had already drifted in a dozen small ways (the `Authorization` header, `unverified`, the complexity cap, `printWidth`); the drift is the cost |
| One package instead of five                                     | encoding-helper would install the archive client and spark-md5 it never uses, and one version number would couple unrelated changes                            |
| GitHub Packages registry                                        | Requires an auth token even to install public packages, which every contributor and CI job of the apps would need                                              |
| pnpm or Turborepo                                               | Five small packages and `tsc -b` do not need a task graph; the apps use npm, so the same lockfile format and commands here keep one mental model               |
