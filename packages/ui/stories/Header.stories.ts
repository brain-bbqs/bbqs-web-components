import { buildAccountMenu, buildThemeToggle, initThemeToggle, renderAuthState, renderIdentity } from "@brain-bbqs/ui";
import { withCard, withTheme } from "./utils.js";

type AuthState = "signed-out" | "signed-in";

const LOGO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#4f46e5"/></svg>',
  );

function buildHeader(auth: AuthState | null): HTMLElement {
  const header = document.createElement("header");
  header.className = "site-header";
  const logo = document.createElement("img");
  logo.className = "brand-logo";
  logo.alt = "";
  logo.src = LOGO;
  const title = document.createElement("div");
  title.className = "site-title";
  title.innerHTML = "<h1>Companion App</h1><p class='site-subtitle'>One line saying what the app is for</p>";
  const actions = document.createElement("div");
  actions.className = "header-actions";
  const toggle = buildThemeToggle();
  actions.append(toggle);
  // The toggle flips the whole preview's theme, like the real header.
  initThemeToggle(toggle, { storageKey: "storybook.theme" });
  if (auth) {
    const { signIn, signedIn } = buildAccountMenu();
    actions.append(signIn, signedIn);
    renderAuthState({ oauthSigninBtn: signIn, oauthSignedIn: signedIn }, auth === "signed-in");
    renderIdentity(
      { oauthAvatar: signedIn.querySelector(".oauth-avatar")!, oauthUsername: signedIn.querySelector("strong")! },
      { username: "ada-lovelace", name: "Ada Lovelace" },
    );
  }
  header.append(logo, title, actions);
  return header;
}

/** bbqs-uploader's and the template's header: the logo is a link, the title a bare <h1>, and the
 * subtitle a centered line of its own under the header. */
function buildLinkedLogoHeader(): HTMLElement[] {
  const header = document.createElement("header");
  header.className = "site-header";
  const link = document.createElement("a");
  link.className = "header-logo-link";
  link.href = "https://brain-bbqs.org";
  const logo = document.createElement("img");
  logo.className = "header-logo";
  logo.alt = "Companion App";
  logo.src = LOGO;
  link.append(logo);
  const title = document.createElement("h1");
  title.textContent = "Companion App";
  const actions = document.createElement("div");
  actions.className = "header-actions";
  actions.append(buildThemeToggle("theme-toggle"));
  header.append(link, title, actions);
  const subtitle = document.createElement("p");
  subtitle.className = "site-subtitle";
  const text = document.createElement("span");
  text.textContent = "One line saying what the app is for";
  subtitle.append(text);
  return [header, subtitle];
}

export default {
  title: "Shell/Header",
};

export const SignedOutLight = {
  name: "Signed out (light)",
  render: () => withTheme("light", () => withCard(buildHeader("signed-out"))),
};

export const SignedOutDark = {
  name: "Signed out (dark)",
  render: () => withTheme("dark", () => withCard(buildHeader("signed-out"))),
};

export const SignedInLight = {
  name: "Signed in (light)",
  render: () => withTheme("light", () => withCard(buildHeader("signed-in"))),
};

export const SignedInDark = {
  name: "Signed in (dark)",
  render: () => withTheme("dark", () => withCard(buildHeader("signed-in"))),
};

export const NoSignIn = {
  name: "Theme toggle only",
  render: () => withTheme("light", () => withCard(buildHeader(null))),
};

export const LinkedLogoLight = {
  name: "Linked logo, subtitle below (bbqs-uploader, template)",
  render: () => withTheme("light", () => withCard(buildLinkedLogoHeader())),
};

export const LinkedLogoDark = {
  name: "Linked logo, subtitle below (dark)",
  render: () => withTheme("dark", () => withCard(buildLinkedLogoHeader())),
};
