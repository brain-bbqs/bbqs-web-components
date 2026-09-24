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
});

describe("createThemeStore", () => {
  it("stores one of the two themes under the app's key", () => {
    const store = createThemeStore(KEY);
    expect(store.values).toEqual(THEMES);
    store.save("dark");
    expect(localStorage.getItem(KEY)).toBe("dark");
    expect(store.load()).toBe("dark");
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
});
