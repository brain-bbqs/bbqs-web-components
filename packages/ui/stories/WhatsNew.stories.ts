import { buildPageFooter, buildWhatsNew, initWhatsNew, renderVersion } from "@brain-bbqs/ui";
import { withTheme } from "./utils.js";

declare const __APP_VERSION__: string;

const REPO = "https://github.com/brain-bbqs/companion-app";

/** A changelog in the apps' shape: every construct they use, over more versions than show at first. */
const CHANGELOG = `# Changelog

## 1.4.0

#### 🚀 Enhancement

- Added a **What's New** link to the footer, showing the latest changes from \`CHANGELOG.md\` ([#60](${REPO}/pull/60))

## 1.3.2

#### 🐛 Bug Fix

- Fixed a folder picked while your datasets were still loading never being checked against EMBER ([#58](${REPO}/pull/58))
- Python cache files (\`__pycache__/\`, \`*.pyc\`) dropped as part of a folder are now filtered out before upload ([#57](${REPO}/pull/57))

## 1.3.1

#### 🏠 Internal

- Moved the page's styling onto the shared \`@brain-bbqs/ui\` stylesheet; nothing looks different ([#56](${REPO}/pull/56))

## 1.3.0

#### 🚀 Enhancement

- Uploads to a dataset flagged for human subjects now ask you to confirm the data is de-identified ([#55](${REPO}/pull/55))

## 0.1.0

Everything built before the project began tracking versions.

#### 🚀 Enhancement

- Replaced the trim buttons with In and Out handles dragged directly on the timeline ([#15](${REPO}/pull/15))
`;

/** Many versions with long entries, so the list scrolls between the fixed header and Show more. */
const LONG_CHANGELOG =
  "# Changelog\n\n" +
  Array.from({ length: 14 }, (_, i) => {
    const v = `2.${13 - i}.0`;
    return [
      `## ${v}`,
      "",
      "#### 🚀 Enhancement",
      "",
      `- Staged folders now remember which files you deselected, so reopening the page after a crash picks up exactly where the last session left off, including ignore patterns such as \`*.tmp\` and \`.DS_Store\` ([#${200 - i}](${REPO}/pull/${200 - i}))`,
      `- The dataset picker lists **every** incoming dataset you can upload to, and says why one is missing when it cannot ([#${150 - i}](${REPO}/pull/${150 - i}))`,
      "",
      "#### 🐛 Bug Fix",
      "",
      `- Fixed the progress bar stalling at 99% on a last part smaller than a megabyte ([#${100 - i}](${REPO}/pull/${100 - i}))`,
      "",
    ].join("\n");
  }).join("\n");

/**
 * The footer bar with the What's New link as its first row, and the modal it opens. The hash is
 * off so opening it leaves the Storybook URL alone.
 */
function buildPage(changelog: string, recentVersions = 3): HTMLElement {
  const { button, dialog } = buildWhatsNew();
  const footer = buildPageFooter({ repoUrl: REPO, leadingRows: [button] });
  renderVersion(footer.querySelector(".version-link")!, __APP_VERSION__);
  // In the story the bar sits in the flow rather than fixed to the preview's bottom edge.
  footer.style.position = "static";
  const page = document.createElement("div");
  page.append(footer, dialog);
  initWhatsNew(
    {
      button,
      dialog,
      close: dialog.querySelector(".whats-new-close")!,
      content: dialog.querySelector(".whats-new-content")!,
      showMore: dialog.querySelector(".whats-new-show-more")!,
    },
    { changelog, recentVersions, hash: null },
  );
  return page;
}

/** encoding-helper imports shell.css and whats-new.css alone, over its own darker palette. */
function withEncodingHelperPalette(page: HTMLElement): HTMLElement {
  const palette: Record<string, string> = {
    "--bg": "#1a1a2e",
    "--card": "#252540",
    "--text": "#eeeeee",
    "--muted": "#888888",
    "--border": "#444444",
    "--accent": "#818cf8",
    "--accent-soft": "#262b45",
    // Its --chip-bg, through the knob: its --accent-soft is too close to its --card for code.
    "--whats-new-code-bg": "#333a54",
  };
  for (const [token, value] of Object.entries(palette)) page.style.setProperty(token, value);
  page.style.background = "var(--bg)";
  page.style.color = "var(--text)";
  return page;
}

type Play = { play: (context: { canvasElement: HTMLElement }) => void };

/** Opens the modal the way a visitor does, from the footer link. */
const open: Play["play"] = ({ canvasElement }) => {
  canvasElement.querySelector<HTMLButtonElement>(".whats-new-link")!.click();
};

/** Opens it, then asks for every version. */
const expand: Play["play"] = (context) => {
  open(context);
  context.canvasElement.querySelector<HTMLButtonElement>(".whats-new-show-more")!.click();
};

export default {
  title: "Shell/What's New",
};

export const FooterLink = {
  name: "Footer link (closed)",
  render: () => withTheme("light", () => buildPage(CHANGELOG)),
};

export const OpenLight = {
  name: "Open (light)",
  render: () => withTheme("light", () => buildPage(CHANGELOG)),
  play: open,
};

export const OpenDark = {
  name: "Open (dark)",
  render: () => withTheme("dark", () => buildPage(CHANGELOG)),
  play: open,
};

export const ExpandedLight = {
  name: "Expanded with Show more (light)",
  render: () => withTheme("light", () => buildPage(CHANGELOG)),
  play: expand,
};

export const ExpandedDark = {
  name: "Expanded with Show more (dark)",
  render: () => withTheme("dark", () => buildPage(CHANGELOG)),
  play: expand,
};

export const LongLight = {
  name: "Long changelog (light)",
  render: () => withTheme("light", () => buildPage(LONG_CHANGELOG)),
  play: open,
};

export const LongDark = {
  name: "Long changelog (dark)",
  render: () => withTheme("dark", () => buildPage(LONG_CHANGELOG)),
  play: open,
};

export const LongExpandedDark = {
  name: "Long changelog, expanded (dark)",
  render: () => withTheme("dark", () => buildPage(LONG_CHANGELOG)),
  play: expand,
};

export const EncodingHelperPalette = {
  name: "encoding-helper's own dark palette",
  render: () => withTheme("dark", () => withEncodingHelperPalette(buildPage(CHANGELOG))),
  play: open,
};
