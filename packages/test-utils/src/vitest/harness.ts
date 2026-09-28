// Booting an app's real src/main.ts against its real index.html in jsdom: the pattern the web-app
// template's tests/unit/helpers/mainHarness.ts and bbqs-uploader's each implemented. One test file
// per boot scenario, since a file's module registry runs main.ts's top-level wiring once; the URL,
// the stored state and the stubs a scenario needs go in before that import.
//
// The import itself stays in the app (`importMain: () => import("../../../src/main")`): written
// in the app's own test code, it goes through Vitest's transform and module registry, so `?raw`
// imports, `import.meta.env` and the test file's `vi.mock` calls all apply to main.ts and
// everything it imports. A path resolved in here would not get any of that.

import { bodyOf, readIndexHtml } from "./html.js";
import { offlineFetch, type FetchRouter } from "./fetch.js";
import {
  installCanvasStub,
  installDialogPolyfill,
  installMatchMedia,
  installObserverStub,
  type CanvasStub,
  type ObserverStub,
} from "./jsdom.js";

type ObserverName = "ResizeObserver" | "IntersectionObserver" | "MutationObserver";

export interface MainHarnessOptions {
  /** Imports the app's entry module, e.g. `() => import("../../../src/main")`. */
  importMain: () => Promise<unknown>;
  /** The page's markup (default the app's index.html, read from the Vitest root). */
  indexHtml?: string;
  /** Give main.ts a recording 2D canvas context (`installCanvasStub`), for an app that draws at
   * boot (clip-extractor's stage). */
  canvas?: boolean;
  /** Observers jsdom lacks that main.ts constructs at boot (`installObserverStub`), e.g.
   * `["ResizeObserver"]` for clip-extractor's blur tool. */
  observers?: ObserverName[];
}

export interface BootOptions {
  /** Where the page boots, relative to "/": a search, a hash or both ("?test&mock_file",
   * "#changelog"), or a path starting with "/". */
  url?: string;
  /** Entries stored before main.ts runs, as a returning visitor's browser would hold them. (A
   * test may equally call `localStorage.setItem` itself before booting.) */
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  /**
   * The fetch main.ts sees. By default every call rejects like a network failure (and is
   * recorded), unless the test already replaced `fetch` itself, in which case that stays. Pass
   * false to leave fetch alone either way.
   */
  fetch?: typeof fetch | false;
  /** What matchMedia answers (default false: a light OS theme). */
  matchMedia?: boolean | ((query: string) => boolean);
  /** Runs once the page, storage and stubs are in place, right before main.ts is imported. */
  beforeImport?: () => void | Promise<void>;
}

export interface BootedMain {
  /** What `importMain` resolved to. */
  module: unknown;
  /** The recording fetch the harness installed, or null when the test's own fetch stayed. */
  fetch: FetchRouter | null;
  /** The canvas stub, when the harness was created with `canvas: true`. */
  canvas: CanvasStub | null;
  /** The observer stubs, by name, for those the harness was created with. */
  observers: Partial<Record<ObserverName, ObserverStub>>;
}

export interface MainHarness {
  /**
   * Boots the app: sets the URL, mounts the page's body without its scripts, seeds storage,
   * installs the fetch, matchMedia and <dialog> stand-ins (and the canvas and observer stubs the
   * harness was created with), and imports main.ts. Call it once per test file, from `beforeAll`;
   * a second call throws, since main.ts would not run again.
   * A string is shorthand for `{ url }`.
   */
  bootMain: (options?: string | BootOptions) => Promise<BootedMain>;
}

function seed(storage: Storage, entries: Record<string, string> | undefined): void {
  for (const [key, value] of Object.entries(entries ?? {})) storage.setItem(key, value);
}

/** Empties both storages where the environment has them, and ignores one that refuses. */
function clearStorage(): void {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      (globalThis as Partial<Record<typeof name, Storage>>)[name]?.clear();
    } catch {
      // A test environment without Web Storage: nothing to clear.
    }
  }
}

/**
 * A harness for one app. Create it once, in the app's test helpers or at the top of a test file:
 * it runs while the test file is still importing, so it empties localStorage and sessionStorage
 * before anything the file's own setup stores, and notes the environment's fetch, so a fetch the
 * setup stubs is recognized as the test's and left in place.
 */
export function createMainHarness({ importMain, indexHtml, canvas, observers = [] }: MainHarnessOptions): MainHarness {
  clearStorage();
  const environmentFetch = globalThis.fetch;
  let booted = false;

  return {
    async bootMain(options = {}) {
      if (booted) {
        throw new Error("bootMain() already ran main.ts in this test file; give each boot scenario its own file.");
      }
      booted = true;
      const opts = typeof options === "string" ? { url: options } : options;
      const url = opts.url ?? "";
      window.history.replaceState(null, "", url.startsWith("/") ? url : `/${url}`);
      document.body.innerHTML = bodyOf(indexHtml ?? readIndexHtml(), { stripScripts: true });

      seed(localStorage, opts.localStorage);
      seed(sessionStorage, opts.sessionStorage);

      let router: FetchRouter | null = null;
      if (opts.fetch) {
        globalThis.fetch = opts.fetch;
      } else if (opts.fetch === undefined && globalThis.fetch === environmentFetch) {
        router = offlineFetch();
        globalThis.fetch = router;
      }

      installMatchMedia(opts.matchMedia ?? false);
      installDialogPolyfill();
      const canvasStub = canvas ? installCanvasStub() : null;
      const observerStubs: BootedMain["observers"] = {};
      for (const name of observers) observerStubs[name] = installObserverStub(name);
      await opts.beforeImport?.();
      return { module: await importMain(), fetch: router, canvas: canvasStub, observers: observerStubs };
    },
  };
}

/** The element with `id`, or a thrown "missing #id". */
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing #${id}`);
  return found as T;
}

export interface FakeFileOptions {
  /** The path inside a picked or dropped folder, e.g. "base/session1/a.bin". */
  relativePath?: string;
  /** Reported size, when the test needs one bigger than the content. */
  size?: number;
  type?: string;
  /** The bytes (default "x"). */
  content?: BlobPart[];
}

/** A File as a folder pick hands it over: `webkitRelativePath` and, if asked, `size` overridden. */
export function fakeFile(name: string, { relativePath, size, type, content = ["x"] }: FakeFileOptions = {}): File {
  const file = new File(content, name, type === undefined ? undefined : { type });
  if (relativePath !== undefined) {
    Object.defineProperty(file, "webkitRelativePath", { value: relativePath, configurable: true });
  }
  if (size !== undefined) Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
}

/** Picks `files` through a file input (the element or its id), the way the browser's picker does:
 * sets `files` and fires "change". */
export function pickFiles(input: HTMLInputElement | string, files: File[]): void {
  const target = typeof input === "string" ? el<HTMLInputElement>(input) : input;
  Object.defineProperty(target, "files", { value: files, configurable: true });
  target.dispatchEvent(new Event("change"));
}
