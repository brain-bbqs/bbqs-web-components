import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, diagnoseCors, listedTitle, nextPagePath } from "../../src/api.js";
import { ApiError } from "../../src/errors.js";
import { cfg, jsonResponse } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("GETs with the bearer token and hands back the parsed answer", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({ hello: "world" })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await apiFetch(cfg, "/info/")).toEqual({ hello: "world" });
    const [url, init = {}] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.org/api/info/");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it("sends a signed-out call as a real anonymous request, with no Authorization header at all", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({})));
    vi.stubGlobal("fetch", fetchMock);
    await apiFetch({ ...cfg, accessToken: "" }, "/info/");
    const [, init = {}] = fetchMock.mock.calls[0];
    expect(Object.keys(init.headers as Record<string, string>)).not.toContain("Authorization");
  });

  it("serializes a JSON body and labels it as one", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({})));
    vi.stubGlobal("fetch", fetchMock);
    await apiFetch(cfg, "/assets/", { method: "POST", json: { path: "a.mp4" } });
    const [, init = {}] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"path":"a.mp4"}');
  });

  it("returns null for a 204, which carries no body to parse", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ ok: true, status: 204, json: () => Promise.reject(new Error("no body")) }),
    );
    expect(await apiFetch(cfg, "/assets/a1/", { method: "DELETE" })).toBeNull();
  });

  it("turns a failed call into an ApiError quoting the status and the server's own detail", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("no such dandiset") }),
    );
    const err = await apiFetch(cfg, "/dandisets/000999/").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).message).toBe("GET /dandisets/000999/ failed with HTTP 404: no such dandiset");
  });

  it("still reports the status when the failure's body cannot even be read", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ ok: false, status: 502, text: () => Promise.reject(new Error("gone")) } as unknown as Response),
    );
    await expect(apiFetch(cfg, "/info/")).rejects.toThrow("GET /info/ failed with HTTP 502");
  });

  it("turns a network failure into an ApiError pointing at the connection, with status 0", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    const failure = apiFetch(cfg, "/info/");
    await expect(failure).rejects.toThrow(/Network error calling \/info\/.*Failed to fetch/);
    await expect(failure).rejects.toMatchObject({ status: 0 });
  });

  it("stringifies even a rejection that is not an Error at all", async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the non-Error rejection is the case under test
    vi.stubGlobal("fetch", () => Promise.reject("socket hangup"));
    await expect(apiFetch(cfg, "/info/")).rejects.toThrow(/socket hangup/);
  });
});

describe("listedTitle", () => {
  it("prefers the published name, the more considered of the two", () => {
    expect(
      listedTitle({
        identifier: "000001",
        most_recent_published_version: { name: "Published" },
        draft_version: { name: "Draft" },
      }),
    ).toBe("Published");
  });

  it("falls back to the draft's name, every dandiset having a draft", () => {
    expect(listedTitle({ identifier: "000001", draft_version: { name: "Draft" } })).toBe("Draft");
  });

  it("answers nothing for a dandiset naming neither", () => {
    expect(listedTitle({ identifier: "000001" })).toBe("");
  });
});

describe("nextPagePath", () => {
  it("turns the archive's absolute next URL back into a path for apiFetch", () => {
    expect(nextPagePath(cfg, "https://api.example.org/api/dandisets/?page=2")).toBe("/dandisets/?page=2");
  });

  it("is null when there is no next page, or when it points at another host", () => {
    expect(nextPagePath(cfg, null)).toBe(null);
    expect(nextPagePath(cfg, undefined)).toBe(null);
    expect(nextPagePath(cfg, "https://elsewhere.org/api/dandisets/?page=2")).toBe(null);
  });
});

describe("diagnoseCors", () => {
  // The probes are distinguishable by their request shape: the "simple" probe sends no
  // headers, the preflighted one sends Authorization, and the write probe POSTs.
  function stubProbes(opts: { simple: boolean; preflighted: boolean; post: boolean }): void {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        const passes = init?.method === "POST" ? opts.post : headers.Authorization ? opts.preflighted : opts.simple;
        if (!passes) return Promise.reject(new TypeError("Failed to fetch"));
        return Promise.resolve({ status: 200 });
      }),
    );
  }

  it("reports a full CORS block when both probes fail", async () => {
    stubProbes({ simple: false, preflighted: false, post: false });
    await expect(diagnoseCors(cfg, "https://app.test")).resolves.toMatch(
      /refuses ALL cross-origin requests from https:\/\/app.test/,
    );
  });

  it("reports a preflight-specific failure when only the authorized probe fails", async () => {
    stubProbes({ simple: true, preflighted: false, post: false });
    await expect(diagnoseCors(cfg)).resolves.toMatch(/preflighted \(OPTIONS\).*requests are rejected/s);
  });

  it("blames an /uploads/-specific rule when reads AND other writes pass", async () => {
    stubProbes({ simple: true, preflighted: true, post: true });
    await expect(diagnoseCors(cfg)).resolves.toMatch(/proxy\/WAF rule specific to the \/uploads\/ path/);
  });

  it("points at the write allowlist when reads pass but writes are blocked", async () => {
    stubProbes({ simple: true, preflighted: true, post: false });
    await expect(diagnoseCors(cfg)).resolves.toMatch(/reads work but writes are blocked/);
  });

  it("names the page's own origin by default", async () => {
    stubProbes({ simple: false, preflighted: false, post: false });
    await expect(diagnoseCors(cfg)).resolves.toContain(window.location.origin);
  });
});
