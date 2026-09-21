import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { createOAuthClient } from "../../src/oauth.js";
import { EMBER_INSTANCE } from "../../src/instances.js";

const CLIENT_ID = "the-client-id";
const STORAGE_KEY = "app.oauth-pkce.v1";
const oauth = createOAuthClient({ clientId: CLIENT_ID, storageKey: STORAGE_KEY });

// jsdom's Crypto has getRandomValues but no SubtleCrypto, which the PKCE challenge needs.
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function tokenResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body), text: () => Promise.resolve("") } as unknown as Response;
}

describe("startLogin", () => {
  it("redirects to the archive's authorize page with an S256 PKCE challenge", async () => {
    let navigated = "";
    await oauth.startLogin((url) => (navigated = url));
    const url = new URL(navigated);
    expect(url.origin + url.pathname).toBe(`${EMBER_INSTANCE.oauth}/authorize/`);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("redirect_uri")).toBe(`${window.location.origin}/`);
  });

  it("stashes the verifier and state for the callback to pick up", async () => {
    let navigated = "";
    await oauth.startLogin((url) => (navigated = url));
    const pending = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as {
      verifier: string;
      state: string;
    } | null;
    expect(pending?.verifier).toBeTruthy();
    expect(pending?.state).toBe(new URL(navigated).searchParams.get("state"));
  });

  it("uses the page's own current path as the redirect URI, so it works from any deploy location", async () => {
    window.history.replaceState({}, "", `${window.location.origin}/pr-preview/pr-19/`);
    let navigated = "";
    await oauth.startLogin((url) => (navigated = url));
    expect(new URL(navigated).searchParams.get("redirect_uri")).toBe(`${window.location.origin}/pr-preview/pr-19/`);
  });

  it("takes a custom redirect URI and archive instance", async () => {
    const custom = createOAuthClient({
      clientId: CLIENT_ID,
      storageKey: STORAGE_KEY,
      instance: { api: "https://a.test/api", web: "https://a.test", oauth: "https://a.test/oauth" },
      redirectUri: () => "https://app.test/callback",
    });
    let navigated = "";
    await custom.startLogin((url) => (navigated = url));
    const url = new URL(navigated);
    expect(url.origin + url.pathname).toBe("https://a.test/oauth/authorize/");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.test/callback");
  });

  it("falls back to a real window navigation when no navigate callback is given", async () => {
    // jsdom implements location.assign as a not-implemented no-op (it logs to the virtual console
    // rather than throwing synchronously in the page), so the default navigate arrow can run for
    // real; the observable effect is the stashed PKCE verifier.
    await oauth.startLogin().catch(() => {});
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeTruthy();
  });
});

describe("handleRedirectCallback", () => {
  it("returns null and leaves the URL untouched when there's no code/state in it", async () => {
    expect(await oauth.handleRedirectCallback()).toBe(null);
  });

  it("exchanges the code for tokens and strips only the OAuth params from the URL", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(tokenResponse({ access_token: "at", refresh_token: "rt", expires_in: 3600 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    await oauth.startLogin(() => {});
    const state = (JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as { state: string }).state;
    window.history.replaceState({}, "", `/?keep=1&code=the-code&state=${state}&scope=read`);

    const before = Date.now();
    const tokens = await oauth.handleRedirectCallback();
    expect(tokens?.accessToken).toBe("at");
    expect(tokens?.refreshToken).toBe("rt");
    expect(tokens?.expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(window.location.search).toBe("?keep=1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { body: string }];
    expect(url).toBe(`${EMBER_INSTANCE.oauth}/token/`);
    const body = new URLSearchParams(init.body);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("the-code");
    expect(body.get("client_id")).toBe(CLIENT_ID);
    expect(body.get("client_secret")).toBeNull();
    expect(body.get("code_verifier")).toBeTruthy();
  });

  it("returns null and strips OAuth params when no login is pending at all", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(tokenResponse({ access_token: "at", expires_in: 3600 })));
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/?code=abc&state=unknown-state");
    expect(await oauth.handleRedirectCallback()).toBe(null);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("treats a corrupted pending-login stash as no pending login at all", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(tokenResponse({ access_token: "at", expires_in: 3600 })));
    vi.stubGlobal("fetch", fetchMock);
    sessionStorage.setItem(STORAGE_KEY, "{not json");
    window.history.replaceState({}, "", "/?code=the-code&state=some-state");
    expect(await oauth.handleRedirectCallback()).toBe(null);
    expect(fetchMock).not.toHaveBeenCalled();
    // Consumed either way: a corrupted stash is not left around to confuse the next callback.
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(null);
    expect(window.location.search).toBe("");
  });

  it("refuses a callback whose state doesn't match the one it sent (CSRF guard)", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(tokenResponse({ access_token: "at", expires_in: 3600 })));
    vi.stubGlobal("fetch", fetchMock);
    await oauth.startLogin(() => {});
    window.history.replaceState({}, "", "/?code=the-code&state=not-the-state");
    expect(await oauth.handleRedirectCallback()).toBe(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ensureFreshToken", () => {
  it("keeps a token that is not near expiry, without a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const tokens = { accessToken: "at", refreshToken: "rt", expiresAt: Date.now() + 3_600_000 };
    expect(await oauth.ensureFreshToken(tokens)).toBe(tokens);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes via the refresh_token grant (no client_secret) when near or past expiry", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(tokenResponse({ access_token: "fresh", refresh_token: "rt2", expires_in: 100 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const refreshed = await oauth.ensureFreshToken({
      accessToken: "old",
      refreshToken: "rt",
      expiresAt: Date.now() - 1,
    });
    expect(refreshed.accessToken).toBe("fresh");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { body: string }];
    expect(url).toBe(`${EMBER_INSTANCE.oauth}/token/`);
    const body = new URLSearchParams(init.body);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("rt");
    expect(body.get("client_secret")).toBeNull();
  });

  it("keeps an expired token that has no refresh token to spend", async () => {
    const tokens = { accessToken: "at", expiresAt: Date.now() - 1 };
    expect(await oauth.ensureFreshToken(tokens)).toBe(tokens);
  });

  it("surfaces a failed token request with the response detail in the error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 400, text: () => Promise.resolve("invalid_grant") })),
    );
    await expect(oauth.ensureFreshToken({ accessToken: "at", refreshToken: "rt", expiresAt: 0 })).rejects.toThrow(
      /HTTP 400.*invalid_grant/,
    );
  });

  it("still reports the HTTP status when the failure response body is unreadable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 502, text: () => Promise.reject(new Error("broke")) })),
    );
    const err = await oauth
      .ensureFreshToken({ accessToken: "at", refreshToken: "rt", expiresAt: 0 })
      .catch((e: unknown) => e);
    expect((err as Error).message).toBe("OAuth token request failed (HTTP 502)");
  });

  it("uses the injected clock to decide freshness and stamp expiry", async () => {
    const clock = createOAuthClient({ clientId: CLIENT_ID, storageKey: STORAGE_KEY, now: () => 1_000_000 });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(tokenResponse({ access_token: "fresh", expires_in: 10 }))),
    );
    const stale = { accessToken: "at", refreshToken: "rt", expiresAt: 1_000_000 + 30_000 };
    const refreshed = await clock.ensureFreshToken(stale);
    expect(refreshed.expiresAt).toBe(1_010_000);
  });
});

describe("revokeToken", () => {
  it("asks the archive to revoke the access token", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(tokenResponse({})));
    vi.stubGlobal("fetch", fetchMock);
    await oauth.revokeToken({ accessToken: "at", expiresAt: Date.now() });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { body: string }];
    expect(String(url)).toBe(`${EMBER_INSTANCE.oauth}/revoke_token/`);
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(init.body);
    expect(body.get("token")).toBe("at");
    expect(body.get("token_type_hint")).toBe("access_token");
    expect(body.get("client_id")).toBe(CLIENT_ID);
  });

  it("swallows a failure, the local state being cleared regardless", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );
    await expect(oauth.revokeToken({ accessToken: "at", expiresAt: Date.now() })).resolves.toBeUndefined();
  });
});
