# Development Guidelines

- Always run `pre-commit` before committing and pushing changes
- To the best of your ability, ensure tests are passing (`npm test`, `npm run typecheck`, `npm run lint`)
- Follow assertion style (actual on left, expected on right)
- This is an npm-workspaces monorepo of independently versioned packages under `packages/`. Do not bump versions by hand: add a changeset (`npx changeset`) naming the packages a PR changes and whether each is a patch, minor or major; the release workflow does the bumping and the `CHANGELOG.md` writing
- Anything added to a package's public surface needs a unit test beside it under that package's `tests/`; Playwright helpers are exercised by `packages/test-utils/tests/integration/`
- Shared CSS selects on classes only, never on ids: the apps own their element ids
- Keep the packages framework-free (plain DOM, TypeScript, ESM); the apps are Vite + vanilla TS
- PR titles should be human-readable and in the past tense; they should NOT use conventional commit style
- Keep PR descriptions short and to the point
- End every PR description with the prompts that asked for the work, verbatim, inside a collapsed `<details>` block titled `Original prompt`
- Limit use of em-dashes in all text
