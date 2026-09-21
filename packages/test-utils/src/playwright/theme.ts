import type { Page } from "@playwright/test";

export interface SeedThemeOptions {
  /** The app's theme key, e.g. "bbqs-uploader.theme". */
  storageKey: string;
}

/** Seeds the stored light/dark override before the page's pre-paint script reads it. */
export async function seedTheme(page: Page, theme: "light" | "dark", { storageKey }: SeedThemeOptions): Promise<void> {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [storageKey, theme] as const);
}
