---
"@brain-bbqs/ui": minor
---

Added the "What's New" changelog modal every app now shares: `whats-new.css` (imported by `index.css`, and on its own by encoding-helper and the web-app template), the `html/whats-new.html` fragment and `buildWhatsNew()`, `getWhatsNewElements()`, and `initWhatsNew(elements, { changelog, recentVersions, hash, linkProtocols })`, which renders the app's `CHANGELOG.md` (a Vite `?raw` import), handles "Show more", the `#changelog` deep link and closing by button, backdrop or Escape. The renderer (`parseChangelog`, `buildChangelog`, `renderChangelog`, `countChangelogVersions`, `isAllowedHref`) builds DOM nodes and never parses markup, links only `https:` by default, and for bbqs-uploader's and the template's changelogs draws exactly what their own `innerHTML` renderer did. One new knob, `--whats-new-code-bg`. Minor because it only adds: nothing existing changes, and `index.css` gains rules only for the new classes.
