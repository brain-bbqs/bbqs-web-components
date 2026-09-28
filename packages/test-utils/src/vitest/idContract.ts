// The index.html/elements.ts id contract, checked both ways: every id the app's lookups require
// is in the page (and a lookup names the one that is missing), and every id in the page is one a
// lookup registers, so an element left behind by a refactor, or added without registering it,
// fails a unit test instead of lingering. The template's rule is "every id the app touches is
// registered in src/ui/elements.ts"; each app passes whatever lookups make up its contract.

import { mountHtml } from "./html.js";

export interface IdContractOptions {
  /** The page, e.g. `readIndexHtml()`; its body is mounted as the document's. */
  html: string;
  /** The app's lookups, e.g. `[getElements, () => getShellElements(SHELL_IDS)]`. An id counts as
   * registered when a lookup asks `document.getElementById` for it or hands back an element
   * carrying it. */
  lookups: (() => unknown) | (() => unknown)[];
  /** Ids the page may carry without a lookup registering them (a styling hook, an anchor target). */
  pageOnly?: (string | RegExp)[];
  /** Whether an id something else in the page points at (a label's `for`, `aria-*`, `list`,
   * `form`, `href="#id"`, `url(#id)`) counts as registered by that reference (default true). */
  allowInPageReferences?: boolean;
  doc?: Document;
}

export interface IdContract {
  /** The message the lookups threw on the unaltered page, or null when they succeeded. */
  error: string | null;
  /** Every id the lookups asked for or handed back, in order. */
  registered: string[];
  /** Registered ids whose absence makes a lookup throw. */
  required: string[];
  /** Registered ids the lookups tolerate the absence of (the account menu of an app without one). */
  optional: string[];
  /** Registered ids the page does not have. */
  absent: string[];
  /** Page ids no lookup registers and nothing exempts. Empty when the lookups failed, since what
   * they register past the failure is then unknown. */
  unregistered: string[];
  /** Ids the page carries more than once. */
  duplicated: string[];
}

const SINGLE_REF_ATTRS = ["for", "list", "form", "popovertarget", "commandfor"];
const LIST_REF_ATTRS = [
  "aria-activedescendant",
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns",
  "headers",
];

/** Ids that other elements of the page point at. */
function inPageReferences(root: ParentNode): Set<string> {
  const refs = new Set<string>();
  for (const el of Array.from(root.querySelectorAll("*"))) {
    for (const attr of Array.from(el.attributes)) {
      const value = attr.value.trim();
      if (SINGLE_REF_ATTRS.includes(attr.name)) refs.add(value);
      else if (LIST_REF_ATTRS.includes(attr.name)) value.split(/\s+/).forEach((id) => refs.add(id));
      else if ((attr.name === "href" || attr.name === "xlink:href") && value.startsWith("#")) refs.add(value.slice(1));
      for (const m of value.matchAll(/url\(\s*['"]?#([^)'"\s]+)/g)) refs.add(m[1]);
    }
  }
  return refs;
}

/** Ids of the elements a lookup handed back, however it nested them (encoding-helper's `panels`). */
function collectReturnedIds(value: unknown, into: Set<string>, depth = 0): void {
  if (depth > 4 || value === null || typeof value !== "object") return;
  if (value instanceof Element) {
    if (value.id) into.add(value.id);
    return;
  }
  for (const nested of Object.values(value)) collectReturnedIds(nested, into, depth + 1);
}

/** Reads the contract between `html` and `lookups` without asserting anything. */
export function readIdContract({
  html,
  lookups,
  pageOnly = [],
  allowInPageReferences = true,
  doc = document,
}: IdContractOptions): IdContract {
  const fns = Array.isArray(lookups) ? lookups : [lookups];
  mountHtml(html, doc);

  const registered = new Set<string>();
  const original = Object.getOwnPropertyDescriptor(doc, "getElementById");
  const lookup = doc.getElementById.bind(doc);
  Object.defineProperty(doc, "getElementById", {
    configurable: true,
    value: (id: string) => {
      registered.add(id);
      return lookup(id);
    },
  });
  const run = (): string | null => {
    try {
      for (const fn of fns) collectReturnedIds(fn(), registered);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  };

  let error: string | null;
  const required: string[] = [];
  const optional: string[] = [];
  try {
    error = run();
    if (error === null) {
      for (const id of Array.from(registered)) {
        const target = lookup(id);
        if (!target) continue;
        // Only the id goes, not the element, so what is nested inside it is still found.
        target.removeAttribute("id");
        (run() === null ? optional : required).push(id);
        target.id = id;
      }
    }
  } finally {
    if (original) Object.defineProperty(doc, "getElementById", original);
    else delete (doc as unknown as Record<string, unknown>).getElementById;
  }

  const pageIds = Array.from(doc.body.querySelectorAll("[id]"), (el) => el.id);
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const id of pageIds) (seen.has(id) ? duplicated : seen).add(id);

  const references = allowInPageReferences ? inPageReferences(doc.body) : new Set<string>();
  const exempt = (id: string): boolean =>
    references.has(id) || pageOnly.some((p) => (typeof p === "string" ? p === id : p.test(id)));

  return {
    error,
    registered: Array.from(registered),
    required,
    optional,
    absent: Array.from(registered).filter((id) => !seen.has(id)),
    unregistered: error === null ? Array.from(seen).filter((id) => !registered.has(id) && !exempt(id)) : [],
    duplicated: Array.from(duplicated),
  };
}

/**
 * Asserts the contract: the lookups succeed on the page, no page id goes unregistered, and no id
 * repeats. Throws one error listing every problem; returns the contract for further assertions
 * (for instance on `required`).
 */
export function expectIdContract(options: IdContractOptions): IdContract {
  const contract = readIdContract(options);
  const problems: string[] = [];
  if (contract.error) problems.push(`the lookups fail on the page: ${contract.error}`);
  if (contract.unregistered.length) {
    problems.push(
      `ids in the page that no lookup registers: ${contract.unregistered.map((id) => `#${id}`).join(", ")}`,
    );
  }
  if (contract.duplicated.length) {
    problems.push(`ids the page repeats: ${contract.duplicated.map((id) => `#${id}`).join(", ")}`);
  }
  if (problems.length) throw new Error(`index.html and the element lookups disagree:\n- ${problems.join("\n- ")}`);
  return contract;
}
