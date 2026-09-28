import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMainHarness, el, fakeFile, pickFiles } from "../../src/vitest/harness.js";

const PAGE = `<!doctype html>
<html lang="en">
  <head><title>App</title></head>
  <body>
    <main><input id="file-input" type="file" /><p id="status"></p></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`;

/** What an entry module would see when it ran: the page, storage, fetch and the stand-ins. */
function snapshot(): Record<string, unknown> {
  return {
    path: window.location.pathname + window.location.search + window.location.hash,
    scripts: document.querySelectorAll("script").length,
    status: document.getElementById("status") !== null,
    stored: localStorage.getItem("app.settings"),
    session: sessionStorage.getItem("app.pkce"),
    dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
    dialog: typeof document.createElement("dialog").showModal,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = "";
});

describe("createMainHarness", () => {
  it("empties storage when it is created, so each test file starts clean", () => {
    localStorage.setItem("left.over", "1");
    sessionStorage.setItem("left.over", "1");
    createMainHarness({ importMain: () => Promise.resolve({}) });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("boots at the URL with the page's body, no scripts, stand-ins in place, and seeded storage", async () => {
    const { bootMain } = createMainHarness({ importMain: () => Promise.resolve(snapshot()), indexHtml: PAGE });
    // Seeded by the test itself after the harness exists: that survives too.
    localStorage.setItem("app.theme", "dark");
    const booted = await bootMain({
      url: "?test&mock_file#changelog",
      localStorage: { "app.settings": '{"id":1}' },
      sessionStorage: { "app.pkce": "verifier" },
      matchMedia: true,
    });
    expect(booted.module).toEqual({
      path: "/?test&mock_file#changelog",
      scripts: 0,
      status: true,
      stored: '{"id":1}',
      session: "verifier",
      dark: true,
      dialog: "function",
    });
    expect(localStorage.getItem("app.theme")).toBe("dark");
    expect(booted.canvas).toBe(null);
    expect(booted.observers).toEqual({});
  });

  it("takes a string as the URL, and a path as it is", async () => {
    const first = createMainHarness({ importMain: () => Promise.resolve(snapshot()), indexHtml: PAGE });
    expect(((await first.bootMain("#changelog")).module as { path: string }).path).toBe("/#changelog");
    const second = createMainHarness({ importMain: () => Promise.resolve(snapshot()), indexHtml: PAGE });
    expect(((await second.bootMain({ url: "/app/?x" })).module as { path: string }).path).toBe("/app/?x");
    const third = createMainHarness({ importMain: () => Promise.resolve(snapshot()), indexHtml: PAGE });
    expect(((await third.bootMain()).module as { dark: boolean }).dark).toBe(false);
  });

  it("reads the app's index.html from the Vitest root by default", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(resolve(import.meta.dirname, "fixtures"));
    const { bootMain } = createMainHarness({ importMain: () => Promise.resolve(el("fixture-root").textContent) });
    expect((await bootMain()).module).toBe("fixture page");
  });

  it("refuses a second boot in the same file, since main.ts would not run again", async () => {
    const { bootMain } = createMainHarness({ importMain: () => Promise.resolve(null), indexHtml: PAGE });
    await bootMain();
    await expect(bootMain()).rejects.toThrow("give each boot scenario its own file");
  });

  it("fails every fetch by default, recording it", async () => {
    const { bootMain } = createMainHarness({
      importMain: () => fetch("https://api.example/users/me/").catch((e: Error) => e.message),
      indexHtml: PAGE,
    });
    const booted = await bootMain();
    expect(booted.module).toBe("Failed to fetch (no route for https://api.example/users/me/)");
    expect(booted.fetch?.calls.map((c) => c.url)).toEqual(["https://api.example/users/me/"]);
  });

  it("leaves a fetch the test stubbed after creating the harness, or one passed in, or any with fetch: false", async () => {
    const stubbed = vi.fn(() => Promise.reject(new Error("network disabled in tests")));
    const a = createMainHarness({ importMain: () => Promise.resolve(globalThis.fetch), indexHtml: PAGE });
    vi.stubGlobal("fetch", stubbed);
    const bootedA = await a.bootMain();
    expect(bootedA.module).toBe(stubbed);
    expect(bootedA.fetch).toBe(null);

    const given = vi.fn();
    const b = createMainHarness({ importMain: () => Promise.resolve(globalThis.fetch), indexHtml: PAGE });
    expect((await b.bootMain({ fetch: given as unknown as typeof fetch })).module).toBe(given);

    const c = createMainHarness({ importMain: () => Promise.resolve(globalThis.fetch), indexHtml: PAGE });
    expect((await c.bootMain({ fetch: false })).module).toBe(given);
  });

  it("installs the canvas and observer stubs it was created with, and runs beforeImport last", async () => {
    const order: string[] = [];
    const { bootMain } = createMainHarness({
      importMain: () => {
        order.push("import");
        const ctx = document.createElement("canvas").getContext("2d");
        ctx?.clearRect(0, 0, 1, 1);
        new ResizeObserver(() => {}).observe(document.body);
        return Promise.resolve(null);
      },
      indexHtml: PAGE,
      canvas: true,
      observers: ["ResizeObserver"],
    });
    const booted = await bootMain({
      beforeImport: () => {
        order.push(`before:${typeof ResizeObserver}`);
      },
    });
    expect(order).toEqual(["before:function", "import"]);
    expect(booted.canvas?.calls.map((c) => c.name)).toEqual(["clearRect"]);
    expect(booted.observers.ResizeObserver?.instances[0].observed).toEqual([document.body]);
    booted.canvas?.restore();
    booted.observers.ResizeObserver?.restore();
  });

  it("tolerates an environment whose storage refuses, or has none", () => {
    vi.spyOn(Storage.prototype, "clear").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => createMainHarness({ importMain: () => Promise.resolve(null) })).not.toThrow();
    vi.restoreAllMocks();
    vi.stubGlobal("localStorage", undefined);
    expect(() => createMainHarness({ importMain: () => Promise.resolve(null) })).not.toThrow();
  });
});

describe("el", () => {
  it("finds an element by id, or names the one that is missing", () => {
    document.body.innerHTML = '<p id="here">x</p>';
    expect(el<HTMLParagraphElement>("here").textContent).toBe("x");
    expect(() => el("gone")).toThrow("missing #gone");
  });
});

describe("fakeFile / pickFiles", () => {
  it("builds a file with a folder path, size and type as asked", () => {
    const file = fakeFile("a.bin", { relativePath: "base/session1/a.bin", size: 4096, type: "application/x" });
    expect(file.name).toBe("a.bin");
    expect(file.webkitRelativePath).toBe("base/session1/a.bin");
    expect(file.size).toBe(4096);
    expect(file.type).toBe("application/x");
    const plain = fakeFile("notes.txt", { content: ["hello"] });
    expect(plain.size).toBe(5);
    expect(Object.getOwnPropertyDescriptor(plain, "webkitRelativePath")).toBe(undefined);
    expect(fakeFile("x").size).toBe(1);
  });

  it("picks files through an input, by element or by id, firing change", () => {
    document.body.innerHTML = '<input id="file-input" type="file" />';
    const input = el<HTMLInputElement>("file-input");
    const picked: number[] = [];
    input.addEventListener("change", () => picked.push(input.files?.length ?? 0));
    pickFiles("file-input", [fakeFile("a"), fakeFile("b")]);
    pickFiles(input, [fakeFile("c")]);
    expect(picked).toEqual([2, 1]);
  });
});
