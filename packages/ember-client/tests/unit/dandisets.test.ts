import { afterEach, describe, expect, it, vi } from "vitest";
import { INCOMING_PREFIX, listIncomingDandisets } from "../../src/dandisets.js";
import { ADMIN_CHECK_BASE_URL } from "../../src/instances.js";
import { cfg, jsonResponse } from "./helpers.js";

interface FakeDandiset {
  identifier: string;
  title?: string;
  publishedTitle?: string;
  embargoed?: boolean;
}

/** Stubs both calls listIncomingDandisets makes: the archive listing and the admin-check service. */
function stubArchive(
  dandisets: FakeDandiset[],
  adminOwned: (identifier: string) => boolean | "error",
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((input: string) => {
    const url = String(input);
    if (url.includes("/admin-owned/")) {
      const identifier = url.split("/admin-owned/")[1];
      const owned = adminOwned(identifier);
      if (owned === "error") return Promise.resolve(jsonResponse({}, false, 500));
      return Promise.resolve(jsonResponse({ adminOwned: owned }));
    }
    return Promise.resolve(
      jsonResponse({
        results: dandisets.map((d) => ({
          identifier: d.identifier,
          embargo_status: d.embargoed === false ? "OPEN" : "EMBARGOED",
          ...(d.title ? { draft_version: { name: d.title } } : {}),
          ...(d.publishedTitle ? { most_recent_published_version: { name: d.publishedTitle } } : {}),
        })),
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("listIncomingDandisets", () => {
  it("asks the archive for the signed-in user's embargoed dandisets, one page of 1000", async () => {
    const fetchMock = stubArchive([], () => true);
    await listIncomingDandisets(cfg);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.org/api/dandisets/?user=me&embargoed=true&page_size=1000");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("keeps only admin-owned datasets titled 'Incoming: …', sorted by title", async () => {
    stubArchive(
      [
        { identifier: "000002", title: `${INCOMING_PREFIX}Zebra lab` },
        { identifier: "000003", title: "Some other dataset" },
        { identifier: "000001", title: `${INCOMING_PREFIX}Ant lab`, embargoed: false },
      ],
      () => true,
    );
    const { datasets, unverified } = await listIncomingDandisets(cfg);
    expect(datasets).toEqual([
      { identifier: "000001", title: "Incoming: Ant lab", embargoed: false },
      { identifier: "000002", title: "Incoming: Zebra lab", embargoed: true },
    ]);
    expect(unverified).toBe(0);
  });

  it("prefers the published version's title over the draft's", async () => {
    stubArchive(
      [{ identifier: "000100", title: "Incoming: Draft Title", publishedTitle: "Incoming: Published Title" }],
      () => true,
    );
    const { datasets } = await listIncomingDandisets(cfg);
    expect(datasets.map((d) => d.title)).toEqual(["Incoming: Published Title"]);
  });

  it("sends no access token to the admin-check service", async () => {
    const fetchMock = stubArchive([{ identifier: "000001", title: "Incoming: Lab A" }], () => true);
    await listIncomingDandisets(cfg);
    // The service resolves ownership with its own archive credentials, so the user's access token
    // must never be attached to this cross-origin call.
    const adminCheckCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/admin-owned/000001"));
    expect(String(adminCheckCall?.[0])).toBe(`${ADMIN_CHECK_BASE_URL}/admin-owned/000001`);
    expect(adminCheckCall?.[1]).toBe(undefined);
  });

  it("asks a different admin-check service when told to", async () => {
    const fetchMock = stubArchive([{ identifier: "000001", title: "Incoming: Lab A" }], () => true);
    await listIncomingDandisets(cfg, { adminCheckBaseUrl: "https://check.test" });
    expect(fetchMock.mock.calls.some(([url]) => String(url) === "https://check.test/admin-owned/000001")).toBe(true);
  });

  it("drops an 'Incoming: ' dataset no admin owns, so it can't be self-provisioned", async () => {
    stubArchive(
      [
        { identifier: "000001", title: "Incoming: Admin backed" },
        { identifier: "000002", title: "Incoming: Self provisioned" },
      ],
      (identifier) => identifier === "000001",
    );
    const { datasets, unverified } = await listIncomingDandisets(cfg);
    expect(datasets.map((d) => d.identifier)).toEqual(["000001"]);
    // A completed "no" is not an outage: nothing to warn the user about.
    expect(unverified).toBe(0);
  });

  it("fails closed when the admin check itself errors, and reports it as unverified", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubArchive([{ identifier: "000001", title: "Incoming: Lab A" }], () => "error");
    const { datasets, unverified } = await listIncomingDandisets(cfg);
    expect(datasets).toEqual([]);
    expect(unverified).toBe(1);
    expect(warn).toHaveBeenCalledWith("Could not verify admin ownership of dandiset 000001:", expect.any(Error));
  });

  it("separates a verified dataset from one whose check could not complete, telling the caller which", async () => {
    stubArchive(
      [
        { identifier: "000001", title: "Incoming: Reachable" },
        { identifier: "000002", title: "Incoming: Service down" },
      ],
      (identifier) => (identifier === "000001" ? true : "error"),
    );
    const onUnverified = vi.fn();
    const { datasets, unverified } = await listIncomingDandisets(cfg, { onUnverified });
    expect(datasets.map((d) => d.identifier)).toEqual(["000001"]);
    expect(unverified).toBe(1);
    expect(onUnverified).toHaveBeenCalledWith("000002", expect.any(Error));
  });

  it("returns an empty list when the response has no results", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(jsonResponse({})));
    expect(await listIncomingDandisets(cfg)).toEqual({ datasets: [], unverified: 0 });
  });

  it("treats a dandiset with neither a published nor a draft title as untitled and excludes it", async () => {
    stubArchive([{ identifier: "000100" }], () => true);
    expect((await listIncomingDandisets(cfg)).datasets).toEqual([]);
  });
});
