import { beforeEach, describe, expect, it } from "vitest";
import { EMBER_INSTANCE } from "../../src/instances.js";
import { configProblems, createArchiveSettingsStore, extractDandisetId, resolveConfig } from "../../src/settings.js";

describe("extractDandisetId", () => {
  it("pulls a six-digit dandiset id out of a longer label", () => {
    expect(extractDandisetId("(000456) Incoming: Lab")).toBe("000456");
    expect(extractDandisetId("DANDI:000123")).toBe("000123");
  });

  it("is empty when the input contains no numeric dandiset id", () => {
    expect(extractDandisetId("not-a-real-id")).toBe("");
  });

  it("rejects a hyphen-prefixed id so a placeholder never resolves to a real dandiset", () => {
    expect(extractDandisetId("-000001")).toBe("");
  });
});

describe("resolveConfig", () => {
  it("resolves the EMBER instance URLs, the access token and the dandiset id", () => {
    const cfg = resolveConfig({ dandisetId: "DANDI:000123", oauthAccessToken: "the-access-token" });
    expect(cfg.api).toBe(EMBER_INSTANCE.api);
    expect(cfg.web).toBe(EMBER_INSTANCE.web);
    expect(cfg.accessToken).toBe("the-access-token");
    expect(cfg.dandisetId).toBe("000123");
  });

  it("blanks the token when signed out", () => {
    expect(resolveConfig({ dandisetId: "000123" }).accessToken).toBe("");
  });

  it("carries the embargo status through untouched", () => {
    expect(resolveConfig({ dandisetId: "000123", embargoed: true }).embargoed).toBe(true);
    expect(resolveConfig({ dandisetId: "000123", embargoed: false }).embargoed).toBe(false);
    expect(resolveConfig({ dandisetId: "000123" }).embargoed).toBeUndefined();
  });

  it("resolves against another instance when given one", () => {
    const instance = { api: "https://a.test/api", web: "https://a.test", oauth: "https://a.test/oauth" };
    expect(resolveConfig({ dandisetId: "000123" }, instance)).toMatchObject({ api: instance.api, web: instance.web });
  });
});

describe("configProblems", () => {
  it("flags a missing API URL and not being signed in (dandiset id is secondary while signed out)", () => {
    const problems = configProblems({ api: "", web: "", accessToken: "", dandisetId: "" });
    expect(problems).toHaveLength(2);
    expect(problems).toContain("Not signed in.");
  });

  it("passes for a fully valid config", () => {
    expect(
      configProblems({ api: EMBER_INSTANCE.api, web: EMBER_INSTANCE.web, accessToken: "abc", dandisetId: "000123" }),
    ).toEqual([]);
  });

  it("reports 'No dataset selected.' when signed in but no dandiset is chosen", () => {
    expect(configProblems({ api: EMBER_INSTANCE.api, web: "", accessToken: "abc", dandisetId: "" })).toEqual([
      "No dataset selected.",
    ]);
  });
});

describe("createArchiveSettingsStore", () => {
  const store = createArchiveSettingsStore<{
    dandisetId?: string;
    oauth?: { accessToken: string; expiresAt: number };
    deliveryMode?: string;
  }>("app.settings.v1");

  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips the dandiset id, OAuth tokens and an app's own extra fields", () => {
    store.save({ dandisetId: "000123", oauth: { accessToken: "tok", expiresAt: 42 }, deliveryMode: "download" });
    expect(store.load()).toEqual({
      dandisetId: "000123",
      oauth: { accessToken: "tok", expiresAt: 42 },
      deliveryMode: "download",
    });
    expect(store.key).toBe("app.settings.v1");
  });

  it("returns null when nothing is stored, and clears on saving null", () => {
    expect(store.load()).toBe(null);
    store.save({ dandisetId: "000123" });
    store.save(null);
    expect(localStorage.getItem("app.settings.v1")).toBe(null);
  });
});
