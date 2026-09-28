import { installDialogPolyfill } from "@brain-bbqs/test-utils/vitest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_WHATS_NEW_IDS,
  buildWhatsNew,
  getWhatsNewElements,
  initWhatsNew,
  type WhatsNew,
} from "../../src/whatsNew.js";
import { fragment, mount } from "./fragments.js";

const CHANGELOG = ["# Changelog", "", ...[5, 4, 3, 2, 1].flatMap((n) => [`## 0.0.${n}`, "", `- Change ${n}`, ""])].join(
  "\n",
);

let restoreDialog: () => void;
let whatsNew: WhatsNew | undefined;

beforeAll(() => {
  restoreDialog = installDialogPolyfill();
});

afterAll(() => {
  restoreDialog();
});

afterEach(() => {
  whatsNew?.dispose();
  whatsNew = undefined;
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

/** The reference fragment, mounted and wired, the way an app boots it. */
function boot(options: Partial<Parameters<typeof initWhatsNew>[1]> = {}) {
  mount(fragment("whats-new"));
  const els = getWhatsNewElements();
  whatsNew = initWhatsNew(els, { changelog: CHANGELOG, ...options });
  const versions = (): string[] =>
    Array.from(els.content.querySelectorAll(".changelog-version h3"), (h) => h.textContent);
  return { els, versions };
}

describe("initWhatsNew", () => {
  it("renders the recent versions closed, offering Show more", () => {
    const { els, versions } = boot();
    expect(els.dialog.open).toBe(false);
    expect(versions()).toEqual(["0.0.5", "0.0.4", "0.0.3"]);
    expect(els.showMore.hidden).toBe(false);
  });

  it("opens from the footer link and writes the #changelog fragment", () => {
    const { els } = boot();
    els.button.click();
    expect(els.dialog.open).toBe(true);
    expect(window.location.hash).toBe("#changelog");
    // A second click while open changes nothing.
    els.button.click();
    expect(els.dialog.open).toBe(true);
  });

  it("Show more swaps in the whole changelog and hides itself", () => {
    const { els, versions } = boot();
    els.showMore.click();
    expect(versions()).toEqual(["0.0.5", "0.0.4", "0.0.3", "0.0.2", "0.0.1"]);
    expect(els.showMore.hidden).toBe(true);
  });

  it("the close button closes the modal and strips the fragment", () => {
    const { els } = boot();
    els.button.click();
    els.close.click();
    expect(els.dialog.open).toBe(false);
    expect(window.location.hash).toBe("");
    expect(window.location.href).toBe(`${window.location.origin}/`);
  });

  it("a backdrop click closes it; a click inside it does not", () => {
    const { els } = boot();
    els.button.click();
    els.content.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(els.dialog.open).toBe(true);
    els.dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(els.dialog.open).toBe(false);
    expect(window.location.hash).toBe("");
  });

  it("Escape closes it through the dialog's own cancel, stripping the fragment", () => {
    const { els } = boot();
    els.button.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(els.dialog.open).toBe(false);
    expect(window.location.hash).toBe("");
  });

  it("opens at boot when the page loaded at #changelog", () => {
    window.history.replaceState(null, "", "/?x=1#changelog");
    const { els } = boot();
    expect(els.dialog.open).toBe(true);
    els.close.click();
    // The search survives; only the fragment goes.
    expect(window.location.href).toBe(`${window.location.origin}/?x=1`);
  });

  it("opens when the fragment changes to #changelog, and not for another one", () => {
    const { els } = boot();
    window.history.replaceState(null, "", "/#elsewhere");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(els.dialog.open).toBe(false);
    window.history.replaceState(null, "", "/#changelog");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(els.dialog.open).toBe(true);
  });

  it("leaves a fragment the page moved on to while open", () => {
    const { els } = boot();
    els.button.click();
    window.history.replaceState(null, "", "/#other");
    els.close.click();
    expect(window.location.hash).toBe("#other");
  });

  it("takes another fragment, or none", () => {
    const { els } = boot({ hash: "#whats-new" });
    els.button.click();
    expect(window.location.hash).toBe("#whats-new");
    whatsNew?.dispose();
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/#changelog");

    const plain = boot({ hash: null });
    expect(plain.els.dialog.open).toBe(false);
    plain.els.button.click();
    expect(plain.els.dialog.open).toBe(true);
    expect(window.location.hash).toBe("#changelog");
    plain.els.close.click();
    expect(window.location.hash).toBe("#changelog");
  });

  it("hides Show more when every version already shows", () => {
    const { els, versions } = boot({ recentVersions: 5 });
    expect(versions()).toHaveLength(5);
    expect(els.showMore.hidden).toBe(true);
  });

  it("drives the modal from code, and stops listening once disposed", () => {
    const { els } = boot();
    const controls = whatsNew!;
    controls.open();
    expect(els.dialog.open).toBe(true);
    controls.close();
    expect(els.dialog.open).toBe(false);
    controls.showAll();
    expect(els.showMore.hidden).toBe(true);
    controls.dispose();
    els.button.click();
    expect(els.dialog.open).toBe(false);
  });

  it("uses the window it is given", () => {
    mount(fragment("whats-new"));
    const replaceState = vi.fn();
    const fake = {
      location: { hash: "#changelog", href: "https://app.test/#changelog" },
      history: { replaceState },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window;
    const els = getWhatsNewElements();
    whatsNew = initWhatsNew(els, { changelog: CHANGELOG, window: fake });
    expect(els.dialog.open).toBe(true);
    els.close.click();
    expect(replaceState).toHaveBeenCalledWith({}, "", "https://app.test/");
  });

  it("links only https by default, and what an app opts into", () => {
    const md = "## 1\n\n- [pr](https://github.com/x) [mail](mailto:a@b.test)\n";
    const https = boot({ changelog: md });
    expect(Array.from(https.els.content.querySelectorAll("a"), (a) => a.textContent)).toEqual(["pr"]);
    whatsNew?.dispose();
    document.body.innerHTML = "";
    const mail = boot({ changelog: md, linkProtocols: ["https:", "mailto:"] });
    expect(mail.els.content.querySelectorAll("a")).toHaveLength(2);
    mail.els.showMore.click();
    expect(mail.els.content.querySelectorAll("a")).toHaveLength(2);
  });
});

describe("getWhatsNewElements", () => {
  it("finds the fragment's elements by the default ids", () => {
    mount(fragment("whats-new"));
    const els = getWhatsNewElements();
    expect(els.dialog.id).toBe(DEFAULT_WHATS_NEW_IDS.dialog);
    expect(els.content.id).toBe("whats-new-content");
  });

  it("takes the app's ids, and names a missing one", () => {
    const { button, dialog } = buildWhatsNew({ ids: { button: "whatsNewBtn" } });
    document.body.append(button, dialog);
    expect(getWhatsNewElements({ button: "whatsNewBtn" }).button).toBe(button);
    dialog.querySelector(".whats-new-content")!.removeAttribute("id");
    expect(() => getWhatsNewElements({ button: "whatsNewBtn" })).toThrow(
      "Expected #whats-new-content to exist in the document",
    );
  });
});
