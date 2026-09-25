import { initialsFrom } from "@brain-bbqs/utils";

// The header's EMBER sign-in: a red sign-in button that is swapped for an avatar whose
// hover/focus popover holds the username and the sign-out action.

export interface AccountElements {
  oauthSigninBtn: HTMLElement;
  oauthSignedIn: HTMLElement;
  oauthAvatar: HTMLElement;
  oauthUsername: HTMLElement;
  oauthSignoutBtn?: HTMLElement;
}

/** Who is signed in, as `fetchArchiveUser` in @brain-bbqs/ember-client reports it. */
export interface AccountUser {
  username: string;
  name: string | null;
}

/**
 * Shows the sign-in button or the avatar for the given state, and retires the pre-paint script's
 * stand-in attribute: once the real auth state is known, this element-level hidden state is
 * authoritative and `data-signed-in` on <html> is no longer needed.
 */
export function renderAuthState(
  els: Pick<AccountElements, "oauthSigninBtn" | "oauthSignedIn">,
  signedIn: boolean,
  root: HTMLElement = document.documentElement,
): void {
  els.oauthSigninBtn.hidden = signedIn;
  els.oauthSignedIn.hidden = !signedIn;
  delete root.dataset.signedIn;
}

/**
 * Fills the header's "who's signed in" avatar and username. A null user leaves the header as it is
 * (the next refresh retries) rather than blanking it.
 */
export function renderIdentity(
  els: Pick<AccountElements, "oauthAvatar" | "oauthUsername">,
  user: AccountUser | null,
): void {
  if (!user) return;
  els.oauthUsername.textContent = user.username;
  els.oauthAvatar.textContent = initialsFrom(user.name ?? "");
}

/**
 * Asks `loadUser` who is signed in (typically `() => fetchArchiveUser(cfg)` from
 * @brain-bbqs/ember-client), fills the avatar and username, and returns the user. A failed lookup
 * resolves to null and leaves the header as it is, since the next refresh retries; this is the
 * `renderIdentity` both upload apps kept in `ui/connection.ts`.
 */
export async function refreshIdentity(
  els: Pick<AccountElements, "oauthAvatar" | "oauthUsername">,
  loadUser: () => Promise<AccountUser | null>,
): Promise<AccountUser | null> {
  try {
    const user = await loadUser();
    renderIdentity(els, user);
    return user;
  } catch {
    return null;
  }
}

export interface AccountMenuHandlers {
  onSignIn: () => void;
  onSignOut: () => void;
}

/** Wires the sign-in button and the popover's sign-out button. */
export function bindAccountMenu(els: AccountElements, handlers: AccountMenuHandlers): void {
  els.oauthSigninBtn.addEventListener("click", () => handlers.onSignIn());
  els.oauthSignoutBtn?.addEventListener("click", () => handlers.onSignOut());
}
