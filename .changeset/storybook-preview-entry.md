---
"@brain-bbqs/config": minor
---

Fixes from adopting the configs in the apps: the pre-paint script is prepended to `<head>` again, `createStorybookMain` drops it from Storybook, the Storybook preview has its own browser-safe `@brain-bbqs/config/storybook-preview` entry point, and `createVitestConfig` takes a `coverageReporter` list.
