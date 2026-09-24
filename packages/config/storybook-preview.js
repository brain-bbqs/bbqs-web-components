// The Storybook preview half of ./storybook.js, on its own so an app's preview.ts (which runs in the
// browser) imports nothing that needs Node.

/**
 * The Storybook preview the apps share, minus the stylesheet import (each app's `preview.ts` adds
 * `import "../../src/style.css"` itself, since a JS module cannot import CSS on the app's behalf).
 *
 * The app stylesheets theme <body> themselves (light by default, dark via data-theme or the OS
 * preference), so Storybook's own background layer is disabled rather than painted over it. The
 * toolbar switch pins data-theme explicitly, which also keeps Chromatic snapshots deterministic
 * regardless of the runner's OS color-scheme preference.
 */
export const storybookPreview = {
  parameters: {
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: "App color theme",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    /**
     * @param {() => HTMLElement} story
     * @param {{ globals: { theme?: string } }} context
     * @returns {HTMLElement}
     */
    (story, context) => {
      document.documentElement.dataset.theme = context.globals.theme ?? "light";
      return story();
    },
  ],
};
