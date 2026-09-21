import { createChoiceStore, type ChoiceStore } from "@brain-bbqs/utils";

// Light/dark theme, the way all three apps do it: the toggle writes an explicit override to
// data-theme on <html> (applied before first paint by the pre-paint script from
// @brain-bbqs/config/pre-paint); with nothing stored, data-theme is unset and the OS preference
// applies through the stylesheet's prefers-color-scheme block.

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** The stored override under `key` (e.g. "bbqs-uploader.theme"), or null while the OS decides. */
export function createThemeStore(key: string): ChoiceStore<Theme> {
  return createChoiceStore(key, THEMES);
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
  const store = options.store ?? createThemeStore(options.storageKey ?? "theme");
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
