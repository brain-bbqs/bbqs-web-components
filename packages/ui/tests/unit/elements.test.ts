import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SHELL_IDS, getShellElements, optional, required } from "../../src/elements.js";
import { fragment, mount } from "./fragments.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("required / optional", () => {
  it("returns the element with the id, typed as asked", () => {
    mount('<button id="go">Go</button>');
    expect(required<HTMLButtonElement>("go").textContent).toBe("Go");
    expect(optional<HTMLButtonElement>("go")).toBeInstanceOf(HTMLButtonElement);
  });

  it("names the element that is missing rather than handing back a null", () => {
    expect(() => required("nope")).toThrow("Expected #nope to exist in the document");
    expect(optional("nope")).toBe(null);
  });
});

describe("getShellElements", () => {
  it("finds the toggle, version stamp and account menu in the reference fragments", () => {
    mount(fragment("theme-toggle") + fragment("account-menu") + fragment("page-footer"));
    const els = getShellElements();
    expect(els.themeToggle.id).toBe(DEFAULT_SHELL_IDS.themeToggle);
    expect(els.versionIndicator.id).toBe("version-indicator");
    expect(els.account?.oauthSigninBtn).toBeInstanceOf(HTMLButtonElement);
    expect(els.account?.oauthSignedIn.hidden).toBe(true);
    expect(els.account?.oauthAvatar.getAttribute("aria-label")).toBe("Account menu");
    expect(els.account?.oauthUsername.tagName).toBe("STRONG");
    expect(els.account?.oauthSignoutBtn.getAttribute("role")).toBe("menuitem");
  });

  it("reports no account menu for an app without sign-in, rather than failing", () => {
    mount(fragment("theme-toggle") + fragment("page-footer"));
    expect(getShellElements().account).toBe(null);
  });

  it("takes an app's own ids (bbqs-uploader's kebab-case)", () => {
    mount(
      '<button id="theme-toggle"></button><a id="version-indicator"></a>' +
        '<button id="oauth-signin-btn"></button><div id="oauth-signed-in"><span id="oauth-avatar"></span>' +
        '<strong id="oauth-username"></strong><button id="oauth-signout-btn"></button></div>',
    );
    const els = getShellElements({
      themeToggle: "theme-toggle",
      oauthSigninBtn: "oauth-signin-btn",
      oauthSignedIn: "oauth-signed-in",
      oauthAvatar: "oauth-avatar",
      oauthUsername: "oauth-username",
      oauthSignoutBtn: "oauth-signout-btn",
    });
    expect(els.themeToggle.id).toBe("theme-toggle");
    expect(els.account?.oauthSignoutBtn.id).toBe("oauth-signout-btn");
  });

  it("requires the whole menu once the sign-in button is present", () => {
    mount(fragment("theme-toggle") + fragment("page-footer") + '<button id="oauthSigninBtn"></button>');
    expect(() => getShellElements()).toThrow("Expected #oauthSignedIn to exist in the document");
  });
});
