import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, createThemeStore, currentTheme, initThemeToggle, THEMES } from "../../src/theme.js";

const KEY = "app.theme";

function prefersDark(matches: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches, media: query }));
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  prefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createThemeStore", () => {
  it("stores one of the two themes under the app's key", () => {
    const store = createThemeStore(KEY);
    expect(store.values).toEqual(THEMES);
    store.save("dark");
    expect(localStorage.getItem(KEY)).toBe("dark");
    expect(store.load()).toBe("dark");
  });

  it("warns the way the apps do when the browser refuses the write", () => {
    const refusal = new Error("QuotaExceededError");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw refusal;
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    createThemeStore(KEY).save("dark");
    expect(warn).toHaveBeenCalledWith("Could not save theme preference:", refusal);
  });

  it("hands a refused write to the app's own handler instead", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onError = vi.fn();
    createThemeStore(KEY, onError).save("light");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("currentTheme", () => {
  it("follows the OS preference while nothing is set on <html>", () => {
    expect(currentTheme()).toBe("light");
    prefersDark(true);
    expect(currentTheme()).toBe("dark");
  });

  it("follows an explicit override on <html> over the OS preference", () => {
    prefersDark(true);
    document.documentElement.dataset.theme = "light";
    expect(currentTheme()).toBe("light");
  });

  it("ignores an override that is not a theme", () => {
    document.documentElement.dataset.theme = "sepia";
    expect(currentTheme()).toBe("light");
  });
});

describe("applyTheme", () => {
  it("sets the override and remembers it", () => {
    const store = createThemeStore(KEY);
    applyTheme("dark", store);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(store.load()).toBe("dark");
  });
});

describe("initThemeToggle", () => {
  it("flips and persists the theme on each click, from whichever is in effect", () => {
    const btn = document.createElement("button");
    const toggle = initThemeToggle(btn, { storageKey: KEY });
    expect(toggle.current()).toBe("light");
    btn.click();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(KEY)).toBe("dark");
    btn.click();
    expect(toggle.current()).toBe("light");
    expect(localStorage.getItem(KEY)).toBe("light");
  });

  it("starts from the OS preference when nothing is stored", () => {
    prefersDark(true);
    const btn = document.createElement("button");
    const toggle = initThemeToggle(btn, { store: createThemeStore(KEY) });
    expect(toggle.toggle()).toBe("light");
    expect(toggle.store.key).toBe(KEY);
  });

  it("works on a root other than <html>, and with the default key", () => {
    const root = document.createElement("div");
    const toggle = initThemeToggle(document.createElement("button"), { root });
    toggle.toggle();
    expect(root.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("passes onError to the store it makes from storageKey", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const onError = vi.fn();
    const btn = document.createElement("button");
    initThemeToggle(btn, { storageKey: KEY, onError });
    btn.click();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
