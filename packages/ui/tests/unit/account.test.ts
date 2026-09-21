import { afterEach, describe, expect, it, vi } from "vitest";
import { bindAccountMenu, renderAuthState, renderIdentity } from "../../src/account.js";
import { buildAccountMenu } from "../../src/shell.js";

function menu() {
  const { signIn, signedIn } = buildAccountMenu();
  document.body.append(signIn, signedIn);
  return {
    oauthSigninBtn: signIn,
    oauthSignedIn: signedIn,
    oauthAvatar: signedIn.querySelector<HTMLElement>(".oauth-avatar")!,
    oauthUsername: signedIn.querySelector<HTMLElement>("strong")!,
    oauthSignoutBtn: signedIn.querySelector<HTMLElement>(".oauth-popover-signout")!,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  delete document.documentElement.dataset.signedIn;
});

describe("renderAuthState", () => {
  it("shows the sign-in button while signed out and the avatar once signed in", () => {
    const els = menu();
    renderAuthState(els, false);
    expect(els.oauthSigninBtn.hidden).toBe(false);
    expect(els.oauthSignedIn.hidden).toBe(true);
    renderAuthState(els, true);
    expect(els.oauthSigninBtn.hidden).toBe(true);
    expect(els.oauthSignedIn.hidden).toBe(false);
  });

  it("retires the pre-paint stand-in attribute once the real state is known", () => {
    document.documentElement.dataset.signedIn = "1";
    renderAuthState(menu(), false);
    expect(document.documentElement.dataset.signedIn).toBe(undefined);
  });
});

describe("renderIdentity", () => {
  it("fills in the username and initials-based avatar", () => {
    const els = menu();
    renderIdentity(els, { username: "jdoe", name: "Jane Doe" });
    expect(els.oauthUsername.textContent).toBe("jdoe");
    expect(els.oauthAvatar.textContent).toBe("JD");
  });

  it("falls back to the '??' avatar when the account has no display name", () => {
    const els = menu();
    renderIdentity(els, { username: "jdoe", name: null });
    expect(els.oauthAvatar.textContent).toBe("??");
  });

  it("leaves the header untouched when there is no identity to show", () => {
    const els = menu();
    els.oauthUsername.textContent = "previous";
    renderIdentity(els, null);
    expect(els.oauthUsername.textContent).toBe("previous");
  });
});

describe("bindAccountMenu", () => {
  it("routes the two buttons to the handlers", () => {
    const els = menu();
    const onSignIn = vi.fn();
    const onSignOut = vi.fn();
    bindAccountMenu(els, { onSignIn, onSignOut });
    els.oauthSigninBtn.click();
    els.oauthSignoutBtn.click();
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("copes with a menu that has no sign-out button", () => {
    const els: Omit<ReturnType<typeof menu>, "oauthSignoutBtn"> = menu();
    const onSignIn = vi.fn();
    bindAccountMenu(els, { onSignIn, onSignOut: vi.fn() });
    els.oauthSigninBtn.click();
    expect(onSignIn).toHaveBeenCalled();
  });
});
