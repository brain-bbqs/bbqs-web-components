import { afterEach, describe, expect, it } from "vitest";
import { expectIdContract, readIdContract } from "../../src/vitest/idContract.js";

/** The lookups the apps write: throw naming a missing id, or tolerate an optional one. */
function required(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Expected #${id} to exist in the document`);
  return el;
}
function optional(id: string): HTMLElement | null {
  return document.getElementById(id);
}

const PAGE = `<!doctype html><html><body>
  <header><button id="theme-toggle"></button></header>
  <main>
    <div id="dropzone"><input id="file-input" type="file" /></div>
    <section id="panels"><div id="panel-inspect" class="panel-inspect"></div><div id="panel-encode"></div></section>
    <label for="url-input">URL</label><input id="url-input" />
    <button aria-controls="menu" aria-describedby="hint help"></button><ul id="menu"></ul>
    <p id="hint"></p><p id="help"></p>
    <a href="#top">Top</a><span id="top"></span>
    <svg><defs><linearGradient id="grad"></linearGradient></defs><rect fill="url(#grad)" /><use href="#grad" /></svg>
  </main>
</body></html>`;

function getElements() {
  return {
    themeToggle: required("theme-toggle"),
    dropzone: required("dropzone"),
    fileInput: required("file-input"),
    account: optional("oauthSigninBtn"),
    // Nested, the way encoding-helper groups its panels; one found without getElementById.
    panels: { inspect: document.querySelector<HTMLElement>(".panel-inspect")!, encode: required("panel-encode") },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("readIdContract", () => {
  it("sorts the page's ids into required, optional, absent and unregistered", () => {
    const contract = readIdContract({ html: PAGE, lookups: getElements });
    expect(contract.error).toBe(null);
    expect(contract.registered).toEqual([
      "theme-toggle",
      "dropzone",
      "file-input",
      "oauthSigninBtn",
      "panel-encode",
      "panel-inspect",
    ]);
    // panel-inspect is registered by the element handed back, not by a lookup that could fail.
    expect(contract.required).toEqual(["theme-toggle", "dropzone", "file-input", "panel-encode"]);
    expect(contract.optional).toEqual(["panel-inspect"]);
    expect(contract.absent).toEqual(["oauthSigninBtn"]);
    // Every other id is pointed at from inside the page, except the section around the panels.
    expect(contract.unregistered).toEqual(["panels"]);
    expect(contract.duplicated).toEqual([]);
    // The document's own getElementById is back.
    expect(Object.getOwnPropertyDescriptor(document, "getElementById")).toBe(undefined);
  });

  it("can exempt ids by name or pattern, or count in-page references as unregistered", () => {
    const exempt = readIdContract({ html: PAGE, lookups: [getElements], pageOnly: [/^pan/] });
    expect(exempt.unregistered).toEqual([]);
    const strict = readIdContract({
      html: PAGE,
      lookups: getElements,
      pageOnly: ["panels"],
      allowInPageReferences: false,
    });
    expect(strict.unregistered).toEqual(["url-input", "menu", "hint", "help", "top", "grad"]);
  });

  it("reports the lookups' error on a page missing a required id, and repeated ids", () => {
    const broken = PAGE.replace('id="dropzone"', 'id="drop-zone"').replace('id="hint"', 'id="help"');
    const contract = readIdContract({ html: broken, lookups: getElements });
    expect(contract.error).toBe("Expected #dropzone to exist in the document");
    expect(contract.required).toEqual([]);
    expect(contract.duplicated).toEqual(["help"]);
    // What the lookups would have registered past the failure is unknown, so nothing is judged.
    expect(contract.unregistered).toEqual([]);
  });

  it("reports a non-Error throw by its text", () => {
    const contract = readIdContract({
      html: PAGE,
      lookups: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- the case under test
        throw "no page";
      },
    });
    expect(contract.error).toBe("no page");
  });

  it("puts back a getElementById the document had as its own property", () => {
    const own = document.getElementById.bind(document);
    Object.defineProperty(document, "getElementById", { value: own, configurable: true, writable: true });
    readIdContract({ html: PAGE, lookups: getElements });
    expect(Object.getOwnPropertyDescriptor(document, "getElementById")?.value).toBe(own);
    delete (document as Partial<Document>).getElementById;
  });
});

describe("expectIdContract", () => {
  it("returns the contract when the page and the lookups agree", () => {
    const contract = expectIdContract({ html: PAGE, lookups: getElements, pageOnly: ["panels"] });
    expect(contract.required).toContain("dropzone");
  });

  it("names the ids no lookup registers", () => {
    expect(() => expectIdContract({ html: PAGE, lookups: getElements })).toThrow(
      "index.html and the element lookups disagree:\n- ids in the page that no lookup registers: #panels",
    );
  });

  it("throws one error listing every disagreement", () => {
    const broken = PAGE.replace('id="dropzone"', 'id="drop-zone"').replace('id="hint"', 'id="help"');
    expect(() => expectIdContract({ html: broken, lookups: getElements })).toThrow(
      "index.html and the element lookups disagree:\n" +
        "- the lookups fail on the page: Expected #dropzone to exist in the document\n" +
        "- ids the page repeats: #help",
    );
  });
});
