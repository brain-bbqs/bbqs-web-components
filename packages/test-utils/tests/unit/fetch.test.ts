import { describe, expect, it } from "vitest";
import { jsonResponse, routeFetch, textResponse } from "../../src/vitest/fetch.js";

describe("jsonResponse / textResponse", () => {
  it("derives ok from the status and serves the body both ways", async () => {
    const r = jsonResponse({ a: 1 });
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ a: 1 });
    expect(await r.text()).toBe('{"a":1}');
    expect(jsonResponse({}, 404).ok).toBe(false);
    expect(jsonResponse({}, 404, true).ok).toBe(true);
  });

  it("makes a text body whose json() fails like a real non-JSON body", async () => {
    const r = textResponse("no such dandiset", 404);
    expect(r.ok).toBe(false);
    expect(await r.text()).toBe("no such dandiset");
    await expect(r.json()).rejects.toThrow(SyntaxError);
    expect(textResponse("ok").ok).toBe(true);
  });
});

describe("routeFetch", () => {
  it("routes by substring, regexp or predicate, first match wins, and records every call", async () => {
    const fetchMock = routeFetch([
      { match: "/users/me/", respond: jsonResponse({ username: "ada" }) },
      { match: /\/admin-owned\/(\d+)/, respond: (url) => jsonResponse({ adminOwned: url.endsWith("000123") }) },
      {
        match: (_url, init) => init?.method === "POST",
        respond: () => Promise.resolve(jsonResponse({ posted: true })),
      },
    ]);
    expect(await (await fetchMock("https://api.test/users/me/")).json()).toEqual({ username: "ada" });
    expect(await (await fetchMock(new URL("https://check.test/admin-owned/000123"))).json()).toEqual({
      adminOwned: true,
    });
    expect(await (await fetchMock("https://check.test/admin-owned/000999")).json()).toEqual({ adminOwned: false });
    expect(await (await fetchMock(new Request("https://api.test/x"), { method: "POST" })).json()).toEqual({
      posted: true,
    });
    expect(fetchMock.calls.map((c) => c.url)).toEqual([
      "https://api.test/users/me/",
      "https://check.test/admin-owned/000123",
      "https://check.test/admin-owned/000999",
      "https://api.test/x",
    ]);
    expect(fetchMock.callsTo("/admin-owned/")).toHaveLength(2);
  });

  it("rejects like a network failure for a URL no route matches, so nothing reaches the network", async () => {
    const fetchMock = routeFetch([]);
    await expect(fetchMock("https://api.test/unrouted")).rejects.toThrow(
      /Failed to fetch \(no route for https:\/\/api.test\/unrouted\)/,
    );
    expect(fetchMock.calls).toHaveLength(1);
  });
});
