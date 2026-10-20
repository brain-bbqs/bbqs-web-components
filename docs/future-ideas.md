# Future ideas

Suggestions for later, not commitments. Each one says what would change, why, and what would make
it worth doing.

## Background: the packages are framework-free

The packages use plain DOM, TypeScript and ESM. They have no UI framework and no Custom Elements.
`@brain-bbqs/ui`'s `build*` functions return real `HTMLElement`s, its `bind*`/`init*`/`create*`
functions wire behaviour onto elements the app already has, and its CSS selects on classes only. This
fits what the packages share today: a small page shell (header, theme toggle, footer, modal, dropzone,
sign-in) for three focused tools.

What that buys:

- **Any app can use them.** Vanilla, React, Vue or Svelte apps can all take a returned element, and no
  framework upgrade ever forces a release here.
- **Almost no dependencies.** `@brain-bbqs/ui` depends only on `@brain-bbqs/utils`, which depends on
  nothing. Bundles stay small and supply-chain exposure stays low.
- **No flash on first paint.** The shell's markup sits in the static `index.html`, and the pre-paint
  script sets the theme and `data-signed-in` before the page draws; `renderAuthState` takes over from
  it. A framework-rendered shell would need server rendering to do the same.
- **Safe by construction.** `h()` and the changelog builder only set `textContent`; nothing in
  `@brain-bbqs/ui` assigns `innerHTML`.
- **Easy to read and test.** Plain jsdom in Vitest, Storybook's framework-free HTML renderer, and
  functions short enough to read at a glance.
- **Little churn.** DOM APIs rarely break, so shared code ages well.

What it costs:

- **UI updates are manual.** Nothing keeps the DOM in sync with state; each feature calls the right
  render function itself. Fine for a header, error-prone for dynamic lists or many views of the same
  data.
- **Not every binding can be torn down.** `bindDropzone` and `initWhatsNew` return a `dispose()`, but
  `bindAccountMenu`, `initThemeToggle` and `createHumanSubjectsGate` add listeners with no way to
  remove them. Harmless in apps that never tear the shell down; a leak or a double binding in an app
  that mounts and unmounts it.
- **Awkward to use from a framework.** A React app has to mount a returned element through a ref and
  keep its own renders from replacing it.
- **Ids are a contract the compiler cannot see.** The `html/*.html` snippets and `getShellElements()`
  rely on ids the app keeps in step. `required()` fails loudly at boot, and test-utils'
  `idContract` catches drift in a unit test, but neither is a compile-time check.
- **The repo maintains its own small framework.** `h()`, the typed lookups and the id and class
  conventions are things a framework would provide, and each new widget re-solves focus handling,
  list updates and the like.
- **The style is less familiar.** Most front-end contributors work in a framework, and fewer
  libraries are built for this style.

## Suggestions

### 1. Give every binding a teardown

The cheapest improvement, worth doing whenever `@brain-bbqs/ui` is next touched.

- Return `{ dispose }` from `bindAccountMenu` (it returns `void` today), and add `dispose()` to
  `ThemeToggle` and `HumanSubjectsGate`, following the cleanup list `bindDropzone` and `initWhatsNew`
  already keep.
- Optionally accept a `signal?: AbortSignal` in each `bind*`/`init*`/`create*` options object and pass
  it to `addEventListener(type, listener, { signal })`, so an app can tear down a whole view with one
  `controller.abort()`.

A minor changeset for `@brain-bbqs/ui`. Adding a member to an exported interface only breaks code
that implements the interface itself (a hand-written test fake, say), and in 0.x a minor is the
breaking slot anyway.

### 2. Offer the shell as Custom Elements

Worth doing when an app starts mounting and unmounting parts of the page, or when an app moves to a
framework.

- Wrap the existing functions as `<bbqs-theme-toggle>`, `<bbqs-account-menu>`, `<bbqs-dropzone>` and
  so on. `connectedCallback` builds and binds; `disconnectedCallback` calls the `dispose()` from
  suggestion 1. Options become attributes, and handler callbacks become `CustomEvent`s.
- Render into the light DOM, not a shadow root, so the shared class-based CSS keeps applying.
- Ship them from a separate entry point (say `@brain-bbqs/ui/elements`) that registers the tags, so
  the side-effect-free function API stays as it is for apps that do not want them.
- Every framework already supports Custom Elements, React fully since React 19, so this doubles as
  the framework adapter and no per-framework wrapper package is needed.

Plain Custom Elements keep the packages framework-free and dependency-free. Lit (about 5 KB) would add
reactive properties and templating, but it would change the "framework-free" rule in `AGENTS.md`, so
reach for it only alongside suggestion 3.

### 3. Revisit a reactive layer for stateful widgets

Worth doing when the apps start sharing heavy, stateful widgets, such as a dataset browser with
filtering and paging, or an upload queue with live per-row progress. Manual DOM syncing is where the
current approach stops scaling.

From least to most commitment:

1. A small signals library (for example `@preact/signals-core`, about 2 KB) inside the packages, with
   the public API still taking and returning plain elements.
2. Lit-based Custom Elements (suggestion 2 with Lit), which add declarative templates and reactive
   properties while staying usable from any app.
3. A full framework. Only if all three apps adopt the same one, since the shared packages would then
   force that choice on every consumer.
