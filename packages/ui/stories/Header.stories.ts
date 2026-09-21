import { buildAccountMenu, buildThemeToggle, initThemeToggle, renderAuthState, renderIdentity } from "@brain-bbqs/ui";
import { withCard, withTheme } from "./utils.js";

type AuthState = "signed-out" | "signed-in";

function buildHeader(auth: AuthState | null): HTMLElement {
  const header = document.createElement("header");
  header.className = "site-header";
  const logo = document.createElement("img");
  logo.className = "brand-logo";
  logo.alt = "";
  logo.src =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#4f46e5"/></svg>',
    );
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
