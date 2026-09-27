import { createChoiceStore, type ChoiceStore } from "@brain-bbqs/utils";

// Light/dark theme, the way all three apps do it: the toggle writes an explicit override to
// data-theme on <html> (applied before first paint by the pre-paint script from
// @brain-bbqs/config/pre-paint); with nothing stored, data-theme is unset and the OS preference
// applies through the stylesheet's prefers-color-scheme block.

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** The warning all four apps give when the browser refuses to store the theme. */
function warnThemeNotSaved(e: unknown): void {
  console.warn("Could not save theme preference:", e);
}

/**
 * The stored override under `key` (e.g. "bbqs-uploader.theme"), or null while the OS decides.
 * `onError` hears about a write the browser refused; by default it warns the way the apps do.
 */
export function createThemeStore(key: string, onError: (e: unknown) => void = warnThemeNotSaved): ChoiceStore<Theme> {
  return createChoiceStore(key, THEMES, onError);
}

/** The theme in effect: the explicit override on <html> if any, else the OS preference. */
export function currentTheme(root: HTMLElement = document.documentElement): Theme {
  const explicit = root.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Sets the override on <html> and remembers it. */
export function applyTheme(
  theme: Theme,
  store: ChoiceStore<Theme>,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset.theme = theme;
  store.save(theme);
}

export interface ThemeToggleOptions {
  /** The localStorage key, or a store already made with {@link createThemeStore}. */
  storageKey?: string;
  store?: ChoiceStore<Theme>;
  /** Hears about a refused write when the store is made from `storageKey` (default: the apps' own
   * "Could not save theme preference:" warning). */
  onError?: (e: unknown) => void;
  root?: HTMLElement;
}

export interface ThemeToggle {
  /** Flips between light and dark, from whichever is in effect. */
  toggle(): Theme;
  current(): Theme;
  store: ChoiceStore<Theme>;
}

/** Wires the header's theme button: each click flips and persists the theme. */
export function initThemeToggle(toggleButton: HTMLElement, options: ThemeToggleOptions = {}): ThemeToggle {
  const store = options.store ?? createThemeStore(options.storageKey ?? "theme", options.onError);
  const root = options.root ?? document.documentElement;
  const controls: ThemeToggle = {
    store,
    current: () => currentTheme(root),
    toggle() {
      const next: Theme = currentTheme(root) === "dark" ? "light" : "dark";
      applyTheme(next, store, root);
      return next;
    },
  };
  toggleButton.addEventListener("click", () => controls.toggle());
  return controls;
}
