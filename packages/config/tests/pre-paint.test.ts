// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prePaintPlugin, prePaintScript } from "../pre-paint.js";

const THEME_KEY = "app.theme";
const SETTINGS_KEY = "app.settings.v1";

/** Runs the generated script the way the browser would: as classic, top-level code. */
function runScript(script: string): void {
  // The generated code is the thing under test, so evaluating it is the point.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
  new Function(script)();
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.signedIn;
});

afterEach(() => {
  localStorage.clear();
});

describe("prePaintScript", () => {
  it("applies a stored theme override before first paint", () => {
    localStorage.setItem(THEME_KEY, "dark");
    runScript(prePaintScript({ themeKey: THEME_KEY }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignores a stored value that is not a theme", () => {
    localStorage.setItem(THEME_KEY, "sepia");
    runScript(prePaintScript({ themeKey: THEME_KEY }));
    expect(document.documentElement.dataset.theme).toBe(undefined);
  });

  it("marks a returning signed-in visitor when stored tokens exist", () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ oauth: { accessToken: "tok", expiresAt: 1 } }));
    runScript(prePaintScript({ themeKey: THEME_KEY, settingsKey: SETTINGS_KEY }));
    expect(document.documentElement.dataset.signedIn).toBe("1");
  });

  it("leaves a signed-out visitor unmarked, including when the stored settings hold no token", () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ dandisetId: "000123" }));
    runScript(prePaintScript({ themeKey: THEME_KEY, settingsKey: SETTINGS_KEY }));
    expect(document.documentElement.dataset.signedIn).toBe(undefined);
  });

  it("survives corrupted stored settings rather than throwing before the page loads", () => {
    localStorage.setItem(SETTINGS_KEY, "{not json");
    expect(() => runScript(prePaintScript({ themeKey: THEME_KEY, settingsKey: SETTINGS_KEY }))).not.toThrow();
    expect(document.documentElement.dataset.signedIn).toBe(undefined);
  });

  it("emits no sign-in half for an app without a settings key", () => {
    const script = prePaintScript({ themeKey: THEME_KEY });
    expect(script).not.toContain("signedIn");
    expect(script).toContain(JSON.stringify(THEME_KEY));
  });

  it("quotes the keys as string literals, so a key with a quote in it cannot break out of the script", () => {
    const script = prePaintScript({ themeKey: 'we"ird', settingsKey: "x" });
    expect(script).toContain(String.raw`"we\"ird"`);
    expect(() => runScript(script)).not.toThrow();
  });
});

describe("prePaintPlugin", () => {
  it("injects the script into <head> through Vite's transformIndexHtml hook", () => {
    const plugin = prePaintPlugin({ themeKey: THEME_KEY, settingsKey: SETTINGS_KEY });
    expect(plugin.name).toBe("brain-bbqs:pre-paint");
    const hook = plugin.transformIndexHtml as () => { tag: string; children: string; injectTo: string }[];
    const [tag] = hook();
    expect(tag.tag).toBe("script");
    expect(tag.injectTo).toBe("head");
    expect(tag.children).toBe(prePaintScript({ themeKey: THEME_KEY, settingsKey: SETTINGS_KEY }));
  });
});
