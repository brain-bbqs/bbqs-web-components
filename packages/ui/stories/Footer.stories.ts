import { buildPageFooter, renderVersion } from "@brain-bbqs/ui";
import { withTheme } from "./utils.js";

declare const __APP_VERSION__: string;

const mark = (fill: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${fill}"/></svg>`,
  );

function buildFooter(withExtras: boolean): HTMLElement {
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "footer-button-link";
  clear.textContent = "Clear cache";
  const footer = buildPageFooter({
    repoUrl: "https://github.com/brain-bbqs/companion-app",
    versionRowExtras: withExtras ? [clear] : [],
    brands: [
      {
        href: "https://talmolab.org/",
        label: "Talmo Lab",
        logoSrc: { onLight: mark("#1c2333"), onDark: mark("#ffffff") },
        caption: "Talmo Lab",
      },
      {
        href: "https://centerforopenneuroscience.org",
        label: "Center for Open Neuroscience",
        logoSrc: mark("#4f46e5"),
      },
    ],
  });
  renderVersion(footer.querySelector(".version-link")!, __APP_VERSION__);
  // In the story the bar sits in the flow rather than fixed to the preview's bottom edge.
  footer.style.position = "static";
  return footer;
}

export default {
  title: "Shell/Footer",
};

export const Light = {
  name: "Footer (light)",
  render: () => withTheme("light", () => buildFooter(false)),
};

export const Dark = {
  name: "Footer (dark)",
  render: () => withTheme("dark", () => buildFooter(false)),
};

export const WithCacheControl = {
  name: "With a control beside the version",
  render: () => withTheme("light", () => buildFooter(true)),
};
