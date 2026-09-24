// The inline <script> every app puts at the top of index.html, generated so the two localStorage
// keys it reads are spelled once (in the app's settings module) rather than kept in sync by hand.

/**
 * @typedef {object} PrePaintOptions
 * @property {string} themeKey localStorage key holding the "light"/"dark" override.
 * @property {string} [settingsKey] localStorage key holding the stored settings whose
 *   `oauth.accessToken` marks a returning signed-in visitor. Omit for an app with no sign-in.
 */

/**
 * The script body (no <script> tags) that applies a stored theme override, and marks a returning
 * signed-in visitor, before first paint.
 *
 * The theme half stops a saved dark/light choice from flashing the OS-preferred theme first. The
 * sign-in half sets `data-signed-in="1"` on <html> when stored tokens exist, which the shared CSS
 * uses to swap the sign-in button for the (still-empty) avatar slot from the first frame; the
 * app's renderAuthUI() clears the attribute once the real state is known.
 *
 * @param {PrePaintOptions} options
 * @returns {string}
 */
export function prePaintScript({ themeKey, settingsKey }) {
  const theme = [
    "try {",
    `  var storedTheme = localStorage.getItem(${JSON.stringify(themeKey)});`,
    '  if (storedTheme === "light" || storedTheme === "dark") document.documentElement.dataset.theme = storedTheme;',
    "} catch (e) {}",
  ];
  const signedIn = settingsKey
    ? [
        "try {",
        `  var storedSettings = JSON.parse(localStorage.getItem(${JSON.stringify(settingsKey)}));`,
        "  if (storedSettings && storedSettings.oauth && storedSettings.oauth.accessToken) {",
        '    document.documentElement.dataset.signedIn = "1";',
        "  }",
        "} catch (e) {}",
      ]
    : [];
  return [...theme, ...signedIn].join("\n");
}

/**
 * A Vite plugin injecting {@link prePaintScript} into <head>, so index.html carries no copy of it.
 *
 * @param {PrePaintOptions} options
 * @returns {import("vite").Plugin}
 */
export function prePaintPlugin(options) {
  return {
    name: "brain-bbqs:pre-paint",
    transformIndexHtml() {
      return [{ tag: "script", children: prePaintScript(options), injectTo: "head" }];
    },
  };
}
