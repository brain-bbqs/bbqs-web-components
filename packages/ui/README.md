# @brain-bbqs/ui

The page shell the three BBQS companion apps draw the same way: the theme palette and light/dark
toggle, the header's EMBER account menu, the BBQS watermark and the footer bar with its version
stamp and brand marks, the human-subjects gate, the dropzone, and the typed element lookups that
back them. Plain DOM and CSS; no framework.

```sh
npm install @brain-bbqs/ui
```

## Styles

```css
/* src/style.css */
@import "@brain-bbqs/ui/styles/index.css"; /* tokens + base + shell + components */
/* ...the app's own rules, which may override any token: */
:root {
  --accent: #0e7490;
}
```

An app that lays out `<body>` its own way (encoding-helper) imports `tokens.css`, `shell.css` and
`components.css` individually and skips `base.css`. The shared rules select on classes only; the
apps keep their ids. Two class names are new and replace id selectors the apps had:
`.oauth-signin-btn` on the sign-in button, `.footer-brand-link` / `.footer-brand-logo` on the
footer marks (`con-brand-link` and `talmo-brand-link` before).

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

## Behaviour

```ts
import {
  getShellElements,
  initThemeToggle,
  renderAuthState,
  renderIdentity,
  bindAccountMenu,
  renderVersion,
} from "@brain-bbqs/ui";

declare const __APP_VERSION__: string;
const shell = getShellElements(); // or getShellElements({ themeToggle: "theme-toggle", ... })

initThemeToggle(shell.themeToggle, { storageKey: THEME_KEY });
renderVersion(shell.versionIndicator, __APP_VERSION__);

if (shell.account) {
  bindAccountMenu(shell.account, { onSignIn: () => void oauth.startLogin(), onSignOut: signOut });
  renderAuthState(shell.account, isSignedIn());
  void fetchArchiveUser(cfg).then((user) => renderIdentity(shell.account!, user));
}
```

`createHumanSubjectsGate` owns the confirmed-per-dataset set both upload tools kept in `main.ts`;
`bindDropzone` owns the dragover class, the click-to-browse plumbing and the window-level guard,
leaving what a drop means to the app. `h`, `button`, `svgEl`, `escapeHtml` and `copyToClipboard`
are encoding-helper's DOM helpers, unchanged.

## Storybook

`npm run storybook` here shows every piece in both themes; the stories are what Chromatic
snapshots for this package.
