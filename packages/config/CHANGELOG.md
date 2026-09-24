# @brain-bbqs/config

## 0.2.0

### Minor Changes

- ee91cc3: Fixes from adopting the configs in the apps: the pre-paint script is prepended to `<head>` again, `createStorybookMain` drops it from Storybook, the Storybook preview has its own browser-safe `@brain-bbqs/config/storybook-preview` entry point, and `createVitestConfig` takes a `coverageReporter` list.

## 0.1.0

### Minor Changes

- 096309f: First release: the tooling configs, EMBER archive client, page shell, utilities and test helpers
  that clip-extractor, encoding-helper and bbqs-uploader each carried a copy of, generalized into
  independently versioned packages.
