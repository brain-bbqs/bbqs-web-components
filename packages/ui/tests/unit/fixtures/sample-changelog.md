# Changelog

## 1.3.8

#### 🏠 Internal

- Moved the theme toggle, account menu, human-subjects confirmation and dropzone wiring onto the shared `@brain-bbqs/ui` package; nothing behaves differently ([#98](https://github.com/brain-bbqs/bbqs-uploader/pull/98))

## 1.3.6

#### 🐛 Bug Fix

- Fixed a folder picked while your datasets were still loading never being checked against EMBER ([#96](https://github.com/brain-bbqs/bbqs-uploader/pull/96))
- Python cache/tooling artifacts (`__pycache__/`, `*.pyc`, `*.pyo`, `.pytest_cache/`) dropped as part of a folder are now filtered out before upload ([#38](https://github.com/brain-bbqs/bbqs-uploader/pull/38))

#### 🚀 Enhancement

- Uploads to a **human subjects** dataset now ask you to confirm the data is de-identified & covered by your IRB ([#70](https://github.com/brain-bbqs/clip-extractor/pull/70), [#71](https://github.com/brain-bbqs/clip-extractor/pull/71))
- Renamed the `localStorage`/`sessionStorage` keys from the `dandi-mp4-uploader.*` prefix to `bbqs-uploader.*` ([#36](https://github.com/brain-bbqs/bbqs-uploader/pull/36))
  - An indented follow-up joins the same list

## 1.4.9

#### 🏠 Internal

- Took the theme toggle, version stamp and generic page-building helpers from the shared `@brain-bbqs/ui` package, with no visible change ([#57](https://github.com/brain-bbqs/encoding-helper/pull/57))

## 0.1.0

Everything built before the project began tracking versions.

#### 🚀 Enhancement

- Replaced the trim buttons with In and Out handles dragged directly on the timeline ([#15](https://github.com/brain-bbqs/clip-extractor/pull/15))
- Added the BBQS, CON, and Talmo Lab watermarks <and> a version indicator to the footer "quoted" ([#14](https://github.com/brain-bbqs/clip-extractor/pull/14))
