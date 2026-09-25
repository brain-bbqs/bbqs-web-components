import type { DandiInstance, OAuthTokenSet } from "./types.js";
import { EMBER_INSTANCE } from "./instances.js";

// Authorization Code + PKCE against the archive. The apps are backend-free, so the browser has to
// run the whole flow: there is no server to hold a client secret or a session.

export interface OAuthClientOptions {
  /** The app's own public (PKCE, no secret) OAuth2 application id on the archive. */
  clientId: string;
  /** sessionStorage key the pending login's verifier and state wait under between the redirect
   * out and the redirect back, e.g. "bbqs-uploader.oauth-pkce.v1". */
  storageKey: string;
  instance?: DandiInstance;
  /**
   * The redirect URI the archive sends the code back to. Defaults to wherever this page is being
   * served from (production, a PR preview, local dev): every such location has to be registered as
   * a valid redirect URI on the archive side before sign-in works from there.
   */
  redirectUri?: () => string;
  /** Overridable for tests. */
  now?: () => number;
}

// Function properties rather than methods: none of them reads `this`, so an app can destructure
// them (`const { startLogin } = client`) without tripping the unbound-method lint rule.
export interface OAuthClient {
  /** Redirects the browser to the archive's OAuth2 authorize page (Authorization Code + PKCE). */
  startLogin: (navigate?: (url: string) => void) => Promise<void>;
  /**
   * If the current URL is an OAuth redirect callback (has `code` + `state` query params), completes
   * the PKCE exchange and returns the resulting tokens, stripping the OAuth params from the URL bar
   * either way. Returns null if this isn't a callback, or if `state` doesn't match what was sent.
   */
  handleRedirectCallback: () => Promise<OAuthTokenSet | null>;
  /** Returns a token set with a non-expired access token, refreshing it first if needed. */
  ensureFreshToken: (tokens: OAuthTokenSet) => Promise<OAuthTokenSet>;
  /** Best-effort revocation; never throws, since local state is cleared regardless. */
  revokeToken: (tokens: OAuthTokenSet) => Promise<void>;
}

// django-oauth-toolkit's default access token lifetime; refreshed proactively before it's hit.
const REFRESH_SKEW_MS = 60_000;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return base64UrlEncode(new Uint8Array(digest));
}

interface PendingLogin {
  verifier: string;
  state: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export function createOAuthClient({
  clientId,
  storageKey,
  instance = EMBER_INSTANCE,
  redirectUri = () => `${window.location.origin}${window.location.pathname}`,
  now = Date.now,
}: OAuthClientOptions): OAuthClient {
  function savePendingLogin(pending: PendingLogin): void {
    sessionStorage.setItem(storageKey, JSON.stringify(pending));
  }

  function takePendingLogin(): PendingLogin | null {
    const raw = sessionStorage.getItem(storageKey);
    sessionStorage.removeItem(storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingLogin;
    } catch {
      return null;
    }
  }

  function toTokenSet(resp: TokenResponse): OAuthTokenSet {
    return {
      accessToken: resp.access_token,
      refreshToken: resp.refresh_token,
      expiresAt: now() + resp.expires_in * 1000,
    };
  }

  async function postTokenRequest(params: Record<string, string>): Promise<OAuthTokenSet> {
    const resp = await fetch(`${instance.oauth}/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      throw new Error(`OAuth token request failed (HTTP ${resp.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
    }
    return toTokenSet((await resp.json()) as TokenResponse);
  }

  return {
    async startLogin(navigate = (url) => window.location.assign(url)) {
      const verifier = randomString(32);
      const state = randomString(16);
      const challenge = await sha256Base64Url(verifier);
      savePendingLogin({ verifier, state });

      const url = new URL(`${instance.oauth}/authorize/`);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri());
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("state", state);
      navigate(url.toString());
    },

    async handleRedirectCallback() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) return null;

      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("scope");
      window.history.replaceState({}, "", url.toString());

      const pending = takePendingLogin();
      if (!pending || pending.state !== state) return null;

      return postTokenRequest({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(),
        client_id: clientId,
        code_verifier: pending.verifier,
      });
    },

    async ensureFreshToken(tokens) {
      if (now() < tokens.expiresAt - REFRESH_SKEW_MS) return tokens;
      if (!tokens.refreshToken) return tokens;
      return postTokenRequest({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
        client_id: clientId,
      });
    },

    async revokeToken(tokens) {
      await fetch(`${instance.oauth}/revoke_token/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: tokens.accessToken,
          token_type_hint: "access_token",
          client_id: clientId,
        }).toString(),
      }).catch(() => {
        /* best-effort: local state is cleared regardless */
      });
    },
  };
}
