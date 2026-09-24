import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchArchiveUser } from "../../src/users.js";
import { cfg, jsonResponse } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchArchiveUser", () => {
  it("does nothing (not even a request) without an access token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchArchiveUser({ ...cfg, accessToken: "" })).toBe(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the account off /users/me/", async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({ username: "jdoe", name: "Jane Doe" })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchArchiveUser(cfg)).toEqual({ username: "jdoe", name: "Jane Doe" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.org/api/users/me/");
  });

  it("reports a missing display name as null rather than undefined", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(jsonResponse({ username: "jdoe" })));
    expect(await fetchArchiveUser(cfg)).toEqual({ username: "jdoe", name: null });
  });

  it("treats an answer with no username as no identity", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(jsonResponse({})));
    expect(await fetchArchiveUser(cfg)).toBe(null);
  });
});
