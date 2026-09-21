// Typed lookups for the static skeleton markup in an app's index.html.

/** The element with `id`, or a thrown error naming it, so a renamed id fails at boot with a
 * message rather than as a null dereference somewhere later. */
export function required<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Expected #${id} to exist in the document`);
  return el as unknown as T;
}

/** The element with `id`, or null: for a part of the shell an app does not have. */
export function optional<T extends Element>(id: string): T | null {
  return document.getElementById(id) as unknown as T | null;
}

/** The ids of the shell's elements. The defaults are what clip-extractor and encoding-helper use;
 * bbqs-uploader passes its kebab-case ones. */
export interface ShellElementIds {
  themeToggle: string;
  oauthSigninBtn: string;
  oauthSignedIn: string;
  oauthAvatar: string;
  oauthUsername: string;
  oauthSignoutBtn: string;
  versionIndicator: string;
}

export const DEFAULT_SHELL_IDS: ShellElementIds = {
  themeToggle: "themeToggle",
  oauthSigninBtn: "oauthSigninBtn",
  oauthSignedIn: "oauthSignedIn",
  oauthAvatar: "oauthAvatar",
  oauthUsername: "oauthUsername",
  oauthSignoutBtn: "oauthSignoutBtn",
  versionIndicator: "version-indicator",
};

export interface ShellElements {
  themeToggle: HTMLButtonElement;
  versionIndicator: HTMLAnchorElement;
  /** Null for an app without sign-in (encoding-helper). */
  account: {
    oauthSigninBtn: HTMLButtonElement;
    oauthSignedIn: HTMLElement;
    oauthAvatar: HTMLElement;
    oauthUsername: HTMLElement;
    oauthSignoutBtn: HTMLButtonElement;
  } | null;
}

/**
 * The shell's elements, looked up once at boot. The theme toggle and the version stamp are
 * required (every app has them); the account menu is looked up only when the sign-in button is
 * present, and then all of it is required.
 */
export function getShellElements(ids: Partial<ShellElementIds> = {}): ShellElements {
  const id = { ...DEFAULT_SHELL_IDS, ...ids };
  const signin = optional<HTMLButtonElement>(id.oauthSigninBtn);
  return {
    themeToggle: required<HTMLButtonElement>(id.themeToggle),
    versionIndicator: required<HTMLAnchorElement>(id.versionIndicator),
    account: signin
      ? {
          oauthSigninBtn: signin,
          oauthSignedIn: required<HTMLElement>(id.oauthSignedIn),
          oauthAvatar: required<HTMLElement>(id.oauthAvatar),
          oauthUsername: required<HTMLElement>(id.oauthUsername),
          oauthSignoutBtn: required<HTMLButtonElement>(id.oauthSignoutBtn),
        }
      : null,
  };
}
