import { describe, expect, it } from "vitest";
import { apiFetch, type DandisetListResponse } from "../../src/api.js";
import { ADMIN_CHECK_BASE_URL, EMBER_INSTANCE } from "../../src/instances.js";
import { resolveConfig } from "../../src/settings.js";

// Whether the hosts this package hard-codes still answer the apps the way the client calls them,
// checked against the live services once a day (.github/workflows/daily_live_checks.yml). The unit
// tests stub `fetch`, so nothing else here would notice a host moving, an endpoint changing or an
// app dropping off a CORS allowlist; brain-bbqs/clip-extractor#85 was that, for a storage bucket.
//
// Node's fetch enforces no CORS, so each request a browser would make cross-origin is sent with an
// app's own Origin, and the answer is checked for the header that lets a browser read it.

/** The deployed apps that sign in and call the archive through this package. */
const APP_ORIGINS = ["https://clip-extractor.brain-bbqs.org", "https://upload.brain-bbqs.org"];

const cfg = resolveConfig({ dandisetId: "" });

/** Memoizes a read across the tests below, forgetting a failed one so a retry reads again. */
function shared<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () =>
    (pending ??= load().catch((e: unknown) => {
      pending = null;
      throw e;
    }));
}

/** Any one dandiset the archive lists anonymously, to put a real identifier to the admin check. */
const someDandisetId = shared(async () => {
  const listing = await apiFetch<DandisetListResponse>(cfg, "/dandisets/?page_size=1");
  const identifier = listing?.results?.[0]?.identifier;
  if (!identifier) throw new Error("The archive listed no dandisets.");
  return identifier;
});

describe("EMBER, as @brain-bbqs/ember-client reaches it", () => {
  it("serves the archive's web UI the apps link to", async () => {
    const resp = await fetch(`${EMBER_INSTANCE.web}/`);
    expect(resp.status).toBe(200);
  });

  it("serves the sign-in page createOAuthClient sends visitors to", async () => {
    const resp = await fetch(`${EMBER_INSTANCE.oauth}/authorize/`, { redirect: "manual" });
    expect(resp.status).not.toBe(404);
    expect(resp.status).toBeLessThan(500);
  });

  describe.each(APP_ORIGINS)("from %s", (origin) => {
    it("answers an anonymous API call", async () => {
      const resp = await fetch(`${cfg.api}/info/`, { headers: { Origin: origin } });
      expect(resp.status).toBe(200);
      expect(resp.headers.get("access-control-allow-origin")).toBeOneOf(["*", origin]);
    });

    it("allows the preflight a signed-in API call sends", async () => {
      const resp = await fetch(`${cfg.api}/info/`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization",
        },
      });
      expect(resp.status).toBe(200);
      expect(resp.headers.get("access-control-allow-origin")).toBeOneOf(["*", origin]);
      expect(resp.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("authorization");
    });

    it("lets the sign-in token exchange be read", async () => {
      // A refresh with a made-up token and client: the archive's OAuth server refuses it with its
      // own JSON error, which is enough to show the endpoint is there and readable cross-origin.
      const resp = await fetch(`${EMBER_INSTANCE.oauth}/token/`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: "live-check",
          client_id: "live-check",
        }).toString(),
      });
      expect(resp.status).toBeOneOf([400, 401]);
      expect(resp.headers.get("access-control-allow-origin")).toBeOneOf(["*", origin]);
      expect(await resp.json()).toHaveProperty("error");
    });

    it("answers the admin-check service", async () => {
      const resp = await fetch(`${ADMIN_CHECK_BASE_URL}/admin-owned/${await someDandisetId()}`, {
        headers: { Origin: origin },
      });
      expect(resp.status).toBe(200);
      expect(resp.headers.get("access-control-allow-origin")).toBeOneOf(["*", origin]);
      const body = (await resp.json()) as { adminOwned?: unknown };
      expect(typeof body.adminOwned).toBe("boolean");
    });
  });
});
