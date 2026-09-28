# @brain-bbqs/ui

The page shell the BBQS companion apps draw the same way: the theme palette and light/dark
toggle, the header's EMBER account menu, the BBQS watermark and the footer bar with its version
stamp and brand marks, the "What's New" modal that shows the app's `CHANGELOG.md`, the
human-subjects gate, the dropzone, the dataset picker, and the typed element lookups that back
them. Plain DOM and CSS; no framework.

```sh
npm install @brain-bbqs/ui
```

## Styles

```css
/* src/style.css */
@import "@brain-bbqs/ui/styles/index.css"; /* everything below, in cascade order */
/* ...the app's own rules, which may set any token or knob: */
:root {
  --page-max-width: 960px;
}
```

| File                 | What it draws                                                                   |
| -------------------- | ------------------------------------------------------------------------------- |
| `tokens.css`         | the light and dark palette                                                      |
| `base.css`           | box sizing, `[hidden]`, `body`, `main`, links, `<code>`, focus rings            |
| `shell.css`          | header grid, watermark, theme toggle, account menu, footer bar and brand marks  |
| `components.css`     | imports the four below                                                          |
| `controls.css`       | cards, buttons, the dropdown, `.hint`, `.badge`, `.progress`                    |
| `dropzone.css`       | the dashed drop target, its browse link, hint and reject line                   |
| `dataset-picker.css` | the "View on EMBER" pill, the single-dataset readout, the not-embargoed refusal |
| `human-subjects.css` | the human-subjects compliance banner                                            |
| `whats-new.css`      | the footer's "What's New" link and the changelog modal it opens                 |

An app that draws part of this its own way imports only the rest: encoding-helper, which lays
out `<body>` and its controls itself, imports `shell.css` and `whats-new.css` alone; the web-app
template skips `dropzone.css` and keeps its own. `whats-new.css` reads only the tokens
encoding-helper's own palette defines, and spells out the button resets, focus rings and code
spans that `base.css` and `controls.css` give the other apps, so it needs neither. The shared rules
select on classes only; the apps keep their ids.

### Knobs

Where the apps legitimately differ, a rule reads a custom property with the shared default as its
fallback. They are not declared in `tokens.css`, so `shell.css` works without it; set one on the
app's `:root` to change it.

| Knob                        | Sets                                | Default                    | Set by                                                                               |
| --------------------------- | ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| `--page-max-width`          | `main`'s width cap                  | `860px`                    | clip-extractor `960px`                                                               |
| `--page-padding`            | `main`'s padding                    | `2rem 1rem 5rem`           | clip-extractor `1.5rem 1rem 3rem`                                                    |
| `--code-font`               | `<code>`'s font                     | `monospace`                | clip-extractor `var(--mono)`                                                         |
| `--site-title-size`         | the header's `<h1>`                 | `1.7rem`                   | encoding-helper `2em`                                                                |
| `--button-primary-disabled` | a disabled `.primary` button's fill | `var(--muted)`             | clip-extractor `var(--accent)`                                                       |
| `--footer-bar-padding`      | the footer bar's padding            | `0 0.5rem 0.15rem 0.35rem` | clip-extractor `0 0.5rem 0.15rem 0.5rem`, encoding-helper `0 0.75rem 0.35rem 0.5rem` |
| `--footer-brand-height`     | an uncaptioned footer mark          | `5rem`                     | clip-extractor `4rem`, encoding-helper `60px`                                        |
| `--whats-new-code-bg`       | a code span's fill in What's New    | `var(--accent-soft)`       | encoding-helper `var(--chip-bg)`                                                     |

### Classes the markup carries

The shared CSS keys on these; the `html/` fragments below already have them.

- `.oauth-signin-btn` beside `.primary` on the sign-in button (the red keys on both).
- `.header-logo-link` on the link around a `.header-logo`, when the logo is a link.
- `.header-actions` on the header's right-hand group.
- `.dropzone` on the drop target.
- `.footer-brands` around the footer marks; `.footer-brand-link` (plus `.captioned` for a mark
  with a name under it), `.footer-brand-logo` (plus `.on-light`/`.on-dark` for a pair) and
  `.footer-brand-name`.
- `.site-subtitle` either inside `.site-title`, under the `<h1>` in the header's middle column,
  or on its own line under the header.

## Markup

Each piece exists twice, by design: as a reference fragment under `html/` to paste into
`index.html` (keeping the elements test that reads the real page), and as a DOM builder that
produces the identical structure at boot. The unit tests assert the two agree.

| Fragment                          | Builder                      |
| --------------------------------- | ---------------------------- |
| `html/theme-toggle.html`          | `buildThemeToggle()`         |
| `html/account-menu.html`          | `buildAccountMenu()`         |
| `html/brand-watermark.html`       | `buildBrandWatermark()`      |
| `html/page-footer.html`           | `buildPageFooter()`          |
| `html/human-subjects-banner.html` | `buildHumanSubjectsBanner()` |
| `html/dropzone.html`              | `buildDropzone()`            |
| `html/whats-new.html`             | `buildWhatsNew()`            |

`buildDropzone` takes what each app's zone differs by: a `prompt` of text or nodes (a `<code>` in
it), no `reject` line, the reject line's `rejectId`, and the file `input` placed inside the zone.

## Behaviour

```ts
import {
  getShellElements,
  initThemeToggle,
  renderAuthState,
  refreshIdentity,
  bindAccountMenu,
  renderVersion,
} from "@brain-bbqs/ui";
import { fetchArchiveUser } from "@brain-bbqs/ember-client";

declare const __APP_VERSION__: string;
const shell = getShellElements(); // or getShellElements({ themeToggle: "theme-toggle", ... })

initThemeToggle(shell.themeToggle, { storageKey: THEME_KEY });
renderVersion(shell.versionIndicator, __APP_VERSION__);

if (shell.account) {
  bindAccountMenu(shell.account, { onSignIn: () => void oauth.startLogin(), onSignOut: signOut });
  renderAuthState(shell.account, isSignedIn());
  void refreshIdentity(shell.account, () => fetchArchiveUser(cfg));
}
```

`initThemeToggle` warns "Could not save theme preference:" when the browser refuses the write, as
the apps did; pass `onError` (or a `store`) for other wording. `refreshIdentity` resolves to the
user, or to null after a failed lookup, leaving the header for the next refresh.

`createHumanSubjectsGate` owns the confirmed-per-dataset set both upload tools kept in `main.ts`.
`bindDropzone` owns the dragover class, the click-to-browse plumbing, the file input's `change`
(through `onPick`) and the window-level guard, leaving what a drop means to the app;
`showDropzoneReject` writes a refusal into the reject line with blank lines as `<br><br>` gaps.
`h`, `button`, `svgEl`, `escapeHtml` and `copyToClipboard` are encoding-helper's DOM helpers,
unchanged.

## What's New

The footer link and the modal come from `html/whats-new.html` (or `buildWhatsNew()`, whose link
goes to `buildPageFooter`'s `leadingRows`): the row first in `.footer-left`, the `<dialog>` after
the footer bar. The app hands its own `CHANGELOG.md` in through Vite's `?raw` import, so no build
plugin is involved:

```ts
import changelog from "../CHANGELOG.md?raw";
import { getWhatsNewElements, initWhatsNew } from "@brain-bbqs/ui";

initWhatsNew(getWhatsNewElements(), { changelog });
```

It renders the latest three versions (`recentVersions`), with "Show more" swapping in the rest;
opens from the link, and at boot or on navigation when the URL's fragment is `#changelog` (`hash`,
or `null` for no deep link), writing the fragment while open and removing it on every close; and
closes on the × button, a backdrop click, or Escape. Escape, initial focus and keeping focus inside
are the native modal `<dialog>`'s own. The ids default to the fragment's (`whats-new-button`,
`whats-new-modal`, `whats-new-close`, `whats-new-content`, `whats-new-show-more`);
`getWhatsNewElements({ ... })` takes others.

The renderer reads the subset the apps' changelogs use: `## x.y.z` versions (shown as plain text),
`#### ` subsections, `- ` items (indented ones join the same list), paragraphs, and inline code,
`**bold**` and `[text](https://...)` links, nested inside bold and link text. It never parses
markup: the Markdown is read into a tree of plain objects (`parseChangelog`), and the tree is
drawn with `createElement` and text nodes (`buildChangelog`, `renderChangelog`). The only elements
drawn are `section`, `h3`, `h4`, `ul`, `li`, `p`, `code`, `strong` and `a`; the only attributes
are the section's `class` and a link's `href`, `target="_blank"` and `rel="noopener"`. An `href` is
set only when it parses as an absolute URL on an allowed protocol, `https:` by default
(`linkProtocols` adds others; `javascript:`, `data:`, `vbscript:`, `blob:` and `file:` are refused
even when listed), and a refused link keeps its text. For the four apps' changelogs the result is,
node for node, what their old `innerHTML` renderer produced.

## Storybook

`npm run storybook` here shows every piece in both themes; the stories are what Chromatic
snapshots for this package.
