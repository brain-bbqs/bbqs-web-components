// DOM builders for the pieces of the page shell the apps keep in index.html. Each returns the same
// markup the reference fragments under html/ hold, so an app can either paste the fragment into
// its index.html (and keep its elements test reading the real page) or build the piece at boot.
// Everything is built with createElement and textContent: no markup is parsed.

import { button, h } from "./dom.js";
import { moonIcon, signOutIcon, sunIcon } from "./icons.js";
import { DEFAULT_SHELL_IDS, type ShellElementIds } from "./elements.js";

/** The header's light/dark toggle: an outlined circle holding the moon and the sun, of which the
 * stylesheet shows whichever the current theme is not. */
export function buildThemeToggle(id: string = DEFAULT_SHELL_IDS.themeToggle): HTMLButtonElement {
  const btn = button("theme-toggle");
  btn.id = id;
  btn.setAttribute("aria-label", "Toggle light/dark mode");
  btn.title = "Toggle light/dark mode";
  btn.append(moonIcon(), sunIcon());
  return btn;
}

export interface AccountMenuOptions {
  ids?: Partial<
    Pick<ShellElementIds, "oauthSigninBtn" | "oauthSignedIn" | "oauthAvatar" | "oauthUsername" | "oauthSignoutBtn">
  >;
  signInLabel?: string;
}

/**
 * The sign-in button and the signed-in avatar with its popover. Returns both, since they are
 * siblings in the header rather than one element: the caller appends them where the header puts
 * its actions.
 */
export function buildAccountMenu({ ids = {}, signInLabel = "Sign in with EMBER" }: AccountMenuOptions = {}): {
  signIn: HTMLButtonElement;
  signedIn: HTMLDivElement;
} {
  const id = { ...DEFAULT_SHELL_IDS, ...ids };

  const signIn = button("primary oauth-signin-btn", signInLabel);
  signIn.id = id.oauthSigninBtn;

  const signedIn = h("div", "oauth-signed-in");
  signedIn.id = id.oauthSignedIn;
  signedIn.hidden = true;

  const avatar = h("span", "oauth-avatar");
  avatar.id = id.oauthAvatar;
  avatar.tabIndex = 0;
  avatar.setAttribute("aria-label", "Account menu");

  const popover = h("div", "oauth-popover");
  popover.setAttribute("role", "menu");
  const greeting = h("p", "oauth-popover-greeting", "You are logged in as ");
  const username = h("strong");
  username.id = id.oauthUsername;
  greeting.append(username, ".");
  const divider = h("hr", "oauth-popover-divider");
  const signOut = button("oauth-popover-signout");
  signOut.id = id.oauthSignoutBtn;
  signOut.setAttribute("role", "menuitem");
  signOut.append(h("span", null, "Sign out"), signOutIcon());
  popover.append(greeting, divider, signOut);

  signedIn.append(avatar, popover);
  return { signIn, signedIn };
}

export interface BrandWatermarkOptions {
  /** The BBQS org logo, e.g. "/src/assets/bbqs-logo.png". */
  logoSrc: string;
  href?: string;
  label?: string;
}

/** The fixed top-left BBQS watermark, diametrically opposed to the footer's brand marks. */
export function buildBrandWatermark({
  logoSrc,
  href = "https://brain-bbqs.org",
  label = "BBQS",
}: BrandWatermarkOptions): HTMLAnchorElement {
  const link = h("a", "brand-watermark-link");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute("aria-label", label);
  link.title = label;
  const img = h("img", "brand-watermark-logo");
  img.src = logoSrc;
  img.alt = label;
  link.append(img);
  return link;
}

export interface FooterBrand {
  href: string;
  label: string;
  /** One logo, or a light/dark pair the stylesheet swaps with the theme. */
  logoSrc: string | { onLight: string; onDark: string };
  /** A name set under a wordless mark (the Talmo Lab flask). */
  caption?: string;
}

export interface PageFooterOptions {
  /** The app's GitHub repository, e.g. "https://github.com/brain-bbqs/bbqs-uploader". */
  repoUrl: string;
  versionIndicatorId?: string;
  /** Rows placed above the bug/feature links (bbqs-uploader's "What's New" button). */
  leadingRows?: HTMLElement[];
  /** Controls placed after the version stamp on its row, each preceded by a dot
   * (a "Clear cache" button). */
  versionRowExtras?: HTMLElement[];
  /** Supporting-institution marks, bottom right, in order. */
  brands?: FooterBrand[];
}

/** The fixed bottom bar: bug/feature links and the version stamp on the left, brand marks on the right. */
export function buildPageFooter({
  repoUrl,
  versionIndicatorId = DEFAULT_SHELL_IDS.versionIndicator,
  leadingRows = [],
  versionRowExtras = [],
  brands = [],
}: PageFooterOptions): HTMLDivElement {
  const bar = h("div", "page-footer-bar");
  const left = h("div", "footer-left");

  for (const row of leadingRows) left.append(wrapRow(row));
  left.append(
    wrapRow(textLink(`${repoUrl}/issues/new?template=bug_report.yml`, "🐛 Report a bug")),
    wrapRow(textLink(`${repoUrl}/issues/new?template=feature_request.yml`, "💡 Request a feature")),
  );

  const versionRow = h("div", "footer-row");
  const version = h("a", "version-link");
  version.id = versionIndicatorId;
  version.href = repoUrl;
  version.target = "_blank";
  version.rel = "noopener";
  version.title = "View source on GitHub";
  versionRow.append(version);
  for (const extra of versionRowExtras) {
    const dot = h("span", "footer-dot", "·");
    dot.setAttribute("aria-hidden", "true");
    versionRow.append(dot, extra);
  }
  left.append(versionRow);
  bar.append(left);

  if (brands.length) {
    const marks = h("div", "footer-brands");
    for (const brand of brands) marks.append(buildBrand(brand));
    bar.append(marks);
  }
  return bar;
}

function wrapRow(child: HTMLElement): HTMLDivElement {
  const row = h("div", "footer-row");
  row.append(child);
  return row;
}

function textLink(href: string, text: string): HTMLAnchorElement {
  const a = h("a", "footer-text-link", text);
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

function buildBrand(brand: FooterBrand): HTMLAnchorElement {
  const link = h("a", brand.caption ? "footer-brand-link captioned" : "footer-brand-link");
  link.href = brand.href;
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute("aria-label", brand.label);
  link.title = brand.label;
  if (typeof brand.logoSrc === "string") {
    const img = h("img", "footer-brand-logo");
    img.src = brand.logoSrc;
    img.alt = brand.caption ? "" : brand.label;
    link.append(img);
  } else {
    const light = h("img", "footer-brand-logo on-light");
    light.src = brand.logoSrc.onLight;
    light.alt = "";
    const dark = h("img", "footer-brand-logo on-dark");
    dark.src = brand.logoSrc.onDark;
    dark.alt = "";
    link.append(light, dark);
  }
  if (brand.caption) link.append(h("span", "footer-brand-name", brand.caption));
  return link;
}

export interface HumanSubjectsBannerOptions {
  ids?: Partial<{ banner: string; unconfirmed: string; confirmBtn: string; confirmed: string }>;
  /** A paragraph between the heading and the confirmations (clip-extractor describes its blur tool). */
  intro?: string;
}

/** The compliance warning for a dataset flagged as holding human-subjects data. Starts hidden. */
export function buildHumanSubjectsBanner({ ids = {}, intro }: HumanSubjectsBannerOptions = {}): HTMLDivElement {
  const id = {
    banner: "humanSubjectsBanner",
    unconfirmed: "humanSubjectsUnconfirmed",
    confirmBtn: "humanSubjectsConfirmBtn",
    confirmed: "humanSubjectsConfirmed",
    ...ids,
  };
  const banner = h("div", "human-subjects-banner");
  banner.id = id.banner;
  banner.setAttribute("role", "alert");
  banner.hidden = true;

  const heading = h("p", "human-subjects-heading");
  const warnLeft = h("span", null, "⚠️");
  warnLeft.setAttribute("aria-hidden", "true");
  const warnRight = h("span", null, "⚠️");
  warnRight.setAttribute("aria-hidden", "true");
  heading.append(
    warnLeft,
    h("span", null, "This dataset has been flagged as being intended for HUMAN SUBJECTS"),
    warnRight,
  );
  banner.append(heading);
  if (intro) banner.append(h("p", "human-subjects-body", intro));

  const unconfirmed = h("div");
  unconfirmed.id = id.unconfirmed;
  unconfirmed.append(
    h("p", "human-subjects-body", "Uploads to this dataset are disabled until you confirm both of the following:"),
  );
  const list = h("ul", "human-subjects-body");
  const deidentified = h("li", null, "Every file you upload has been properly ");
  deidentified.append(
    h("strong", null, "de-identified"),
    ": no names, faces, voices, dates of birth, or any other personally identifiable information beyond what your approval explicitly permits.",
  );
  const irb = h("li", null, "Collection and sharing of this data is covered by your institution's ");
  irb.append(h("strong", null, "IRB approval"), ".");
  list.append(deidentified, irb);
  const controls = h("div", "human-subjects-controls");
  const confirmBtn = button("human-subjects-confirm-btn", "I confirm");
  confirmBtn.id = id.confirmBtn;
  controls.append(confirmBtn);
  unconfirmed.append(list, controls);

  const confirmed = h(
    "p",
    "human-subjects-confirmed",
    "✓ Confirmed: data is de-identified and covered by your institution's IRB approval. Uploads are enabled.",
  );
  confirmed.id = id.confirmed;
  confirmed.hidden = true;

  banner.append(unconfirmed, confirmed);
  return banner;
}

export interface DropzoneOptions {
  id?: string;
  /** The emoji or logo shown above the prompt. */
  icon?: string | HTMLElement;
  /** The prompt's text before the browse button, e.g. "Drop a video here, or click to browse ". */
  prompt: string;
  /** The browse button's text, e.g. "files". Omit for a zone with no browse button. */
  browseLabel?: string;
  browseButtonId?: string;
  /** A quieter line under the prompt. */
  hint?: string;
  compact?: boolean;
}

/** The dashed drop target the apps share, in its idle state. */
export function buildDropzone({
  id = "dropzone",
  icon = "📁",
  prompt,
  browseLabel,
  browseButtonId,
  hint,
  compact = false,
}: DropzoneOptions): HTMLDivElement {
  const zone = h("div", compact ? "dropzone compact" : "dropzone");
  zone.id = id;
  const inner = h("div", "dz-inner");
  const iconWrap = h("div", "dz-icon");
  iconWrap.append(typeof icon === "string" ? h("span", null, icon) : icon);
  const p = h("p", null, prompt);
  if (browseLabel) {
    const browse = button("dz-browse", browseLabel);
    if (browseButtonId) browse.id = browseButtonId;
    p.append(browse, ".");
  }
  inner.append(iconWrap, p);
  if (hint) inner.append(h("p", "dz-hint", hint));
  const reject = h("p", "dz-reject");
  reject.hidden = true;
  inner.append(reject);
  zone.append(inner);
  return zone;
}
