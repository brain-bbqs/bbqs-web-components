// The "What's New" modal bbqs-uploader and the web-app template wired in main.ts: a footer link
// opening a <dialog> that shows the latest few versions of CHANGELOG.md, a "Show more" swapping in
// the whole changelog, and the #changelog fragment as a shareable deep link into it. The app hands
// in the changelog text (a Vite `?raw` import of its own CHANGELOG.md, so no build plugin is
// involved); rendering goes through changelog.ts, which builds DOM rather than parsing markup.
//
// Escape, initial focus and keeping focus inside while open are the native modal <dialog>'s own
// behaviour (showModal), as they were in the apps; this only adds the backdrop click.

import { button, h } from "./dom.js";
import { required } from "./elements.js";
import { countChangelogVersions, renderChangelog, type ChangelogOptions } from "./changelog.js";

export interface WhatsNewElementIds {
  button: string;
  dialog: string;
  close: string;
  content: string;
  showMore: string;
}

/** The ids bbqs-uploader and the web-app template use, and the reference fragment carries. */
export const DEFAULT_WHATS_NEW_IDS: WhatsNewElementIds = {
  button: "whats-new-button",
  dialog: "whats-new-modal",
  close: "whats-new-close",
  content: "whats-new-content",
  showMore: "whats-new-show-more",
};

export interface WhatsNewElements {
  /** The footer link that opens the modal. */
  button: HTMLElement;
  dialog: HTMLDialogElement;
  close: HTMLElement;
  /** Where the rendered versions go. */
  content: HTMLElement;
  /** Hidden while every version already shows. */
  showMore: HTMLElement;
}

/** The modal's elements, looked up once at boot; a missing one throws naming its id. */
export function getWhatsNewElements(ids: Partial<WhatsNewElementIds> = {}): WhatsNewElements {
  const id = { ...DEFAULT_WHATS_NEW_IDS, ...ids };
  return {
    button: required<HTMLElement>(id.button),
    dialog: required<HTMLDialogElement>(id.dialog),
    close: required<HTMLElement>(id.close),
    content: required<HTMLElement>(id.content),
    showMore: required<HTMLElement>(id.showMore),
  };
}

export interface WhatsNewOptions extends Pick<ChangelogOptions, "linkProtocols"> {
  /** The app's CHANGELOG.md, e.g. `import changelog from "../CHANGELOG.md?raw"`. */
  changelog: string;
  /** How many versions show before "Show more" (default 3). */
  recentVersions?: number;
  /** The fragment that opens the modal and is written while it is open (default "#changelog"), or
   * null for no deep link. */
  hash?: string | null;
  /** The window whose location and history carry the fragment (default the global one). */
  window?: Window;
}

export interface WhatsNew {
  /** Opens the modal (a no-op while open) and writes the fragment. */
  open(): void;
  close(): void;
  /** Swaps in every version and hides "Show more", as its click does. */
  showAll(): void;
  /** Removes every listener this added. */
  dispose(): void;
}

/** Renders the recent versions into the modal and wires the link, close button, backdrop, "Show
 * more" and the fragment. Opens at once when the page loaded at the fragment. */
export function initWhatsNew(elements: WhatsNewElements, options: WhatsNewOptions): WhatsNew {
  const { changelog, recentVersions = 3, hash = "#changelog", linkProtocols } = options;
  const win = options.window ?? window;
  const { button: link, dialog, close, content, showMore } = elements;
  const cleanups: (() => void)[] = [];
  const on = (target: EventTarget, type: string, listener: (e: Event) => void): void => {
    target.addEventListener(type, listener);
    cleanups.push(() => target.removeEventListener(type, listener));
  };

  renderChangelog(content, changelog, { limit: recentVersions, linkProtocols });
  showMore.hidden = countChangelogVersions(changelog) <= recentVersions;

  const controls: WhatsNew = {
    open() {
      if (!dialog.open) dialog.showModal();
      if (hash && win.location.hash !== hash) win.location.hash = hash.slice(1);
    },
    close() {
      dialog.close();
    },
    showAll() {
      renderChangelog(content, changelog, { linkProtocols });
      showMore.hidden = true;
    },
    dispose() {
      for (const cleanup of cleanups.splice(0)) cleanup();
    },
  };

  on(link, "click", () => controls.open());
  on(close, "click", () => controls.close());
  on(showMore, "click", () => controls.showAll());
  // A click whose target is the <dialog> itself landed on its backdrop; one on its content did not.
  on(dialog, "click", (e) => {
    if (e.target === dialog) controls.close();
  });
  if (hash) {
    // Every way of closing (the button, the backdrop, Escape) ends in "close", so the fragment
    // never outlives the modal it points to.
    on(dialog, "close", () => {
      if (win.location.hash !== hash) return;
      const url = new URL(win.location.href);
      url.hash = "";
      win.history.replaceState({}, "", url.toString());
    });
    on(win, "hashchange", () => {
      if (win.location.hash === hash) controls.open();
    });
    if (win.location.hash === hash) controls.open();
  }
  return controls;
}

export interface WhatsNewMarkupOptions {
  ids?: Partial<WhatsNewElementIds>;
  /** The footer link's text (default "✨ What's New"). */
  label?: string;
  /** The modal's heading (default "What's New"). */
  title?: string;
}

/**
 * The footer link and the modal, as the reference fragment html/whats-new.html has them. The link
 * goes first in the footer's left column (`buildPageFooter({ leadingRows: [button] })` wraps it in
 * its row); the dialog goes after the footer bar.
 */
export function buildWhatsNew({
  ids = {},
  label = "✨ What's New",
  title = "What's New",
}: WhatsNewMarkupOptions = {}): {
  button: HTMLButtonElement;
  dialog: HTMLDialogElement;
} {
  const id = { ...DEFAULT_WHATS_NEW_IDS, ...ids };
  const link = button("whats-new-link", label);
  link.id = id.button;

  const dialog = h("dialog", "whats-new-modal");
  dialog.id = id.dialog;
  const header = h("div", "whats-new-modal-header");
  const close = button("whats-new-close", "×");
  close.id = id.close;
  close.setAttribute("aria-label", "Close");
  // Names the dialog for assistive tech; the id derives from the dialog's so custom ids stay unique.
  const heading = h("h2", null, title);
  heading.id = `${id.dialog}-title`;
  dialog.setAttribute("aria-labelledby", heading.id);
  header.append(heading, close);
  const content = h("div", "whats-new-content");
  content.id = id.content;
  const showMore = button("whats-new-show-more", "Show more");
  showMore.id = id.showMore;
  showMore.hidden = true;
  dialog.append(header, content, showMore);
  return { button: link, dialog };
}
