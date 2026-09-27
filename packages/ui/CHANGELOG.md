# @brain-bbqs/ui

## 0.2.0

### Minor Changes

- 5f9bbbb: Made the shell fit clip-extractor, bbqs-uploader, encoding-helper and the web-app template with no change in what they render. Minor because it adds options: the layout knobs (`--page-max-width`, `--page-padding`, `--code-font`, `--site-title-size`, `--button-primary-disabled`, `--footer-bar-padding`, `--footer-brand-height`), the `.header-logo-link` class, per-component stylesheets (`controls.css`, `dropzone.css`, `dataset-picker.css`, `human-subjects.css`; `components.css` still imports all four), `refreshIdentity`, `showDropzoneReject`, `bindDropzone`'s `onPick`, `buildDropzone`'s `rejectId`, `reject`, `input` and node prompts, and `onError` on `createThemeStore` and `initThemeToggle`.
  
  Shared values that matched no app now match the apps: the sign-in button's red now outranks `button.primary` (it rendered indigo before), `.hint` is 0.8rem, the progress bar is 6px with a linear fill, the dark `--warn-soft`/`--err-soft` and the popover shadow are the ones most apps use, the header restacks at 600px, and the defaults of `main`, the footer bar and its marks are bbqs-uploader's and the template's. The generic button hover tint, `white-space: nowrap` and the `.btn-arrow` sizing are gone from the shared rules, since only one app had each. The theme store warns "Could not save theme preference:" by default, and the human-subjects gate draws its inner blocks from the confirmation alone, as both upload apps did.

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
