import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createChoiceStore,
  createFlagStore,
  createJsonStore,
  readStorageItem,
  writeStorageItem,
} from "../../src/storage.js";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readStorageItem / writeStorageItem", () => {
  it("round-trips a value and removes it for null", () => {
    expect(writeStorageItem("k", "v")).toBe(true);
    expect(readStorageItem("k")).toBe("v");
    expect(writeStorageItem("k", null)).toBe(true);
    expect(readStorageItem("k")).toBe(null);
  });

  it("reports a failed write to the handler rather than throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    const onError = vi.fn();
    expect(writeStorageItem("k", "v", onError)).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("warns by default when a write fails, naming the key", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    writeStorageItem("app.theme", "dark");
    expect(warn).toHaveBeenCalledWith("Could not save app.theme:", expect.any(Error));
  });

  it("reads as absent when storage itself throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(readStorageItem("k")).toBe(null);
  });
});

describe("createJsonStore", () => {
  interface Settings {
    dandisetId?: string;
    oauth?: { accessToken: string; expiresAt: number };
  }
  const store = createJsonStore<Settings>("app.settings.v1");

  it("returns null when nothing has been stored", () => {
    expect(store.load()).toBe(null);
  });

  it("round-trips a record", () => {
    const settings = { dandisetId: "000123", oauth: { accessToken: "tok", expiresAt: 42 } };
    store.save(settings);
    expect(store.load()).toEqual(settings);
    expect(store.key).toBe("app.settings.v1");
  });

  it("clears the stored record when saving null (sign-out)", () => {
    store.save({ dandisetId: "000123" });
    store.save(null);
    expect(localStorage.getItem("app.settings.v1")).toBe(null);
    expect(store.load()).toBe(null);
  });

  it("treats corrupted stored JSON as absent instead of crashing, and says so", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem("app.settings.v1", "{not json");
    expect(store.load()).toBe(null);
    expect(warn).toHaveBeenCalled();
  });

  it("treats a record the validator rejects as absent", () => {
    const strict = createJsonStore<{ v: number }>(
      "app.x",
      (p): p is { v: number } => typeof p === "object" && p !== null && "v" in p,
    );
    localStorage.setItem("app.x", JSON.stringify({ other: 1 }));
    expect(strict.load()).toBe(null);
    strict.save({ v: 2 });
    expect(strict.load()).toEqual({ v: 2 });
  });
});

describe("createChoiceStore", () => {
  const theme = createChoiceStore("app.theme", ["light", "dark"] as const);

  it("returns null when nothing has been stored", () => {
    expect(theme.load()).toBe(null);
  });

  it("round-trips a saved preference", () => {
    theme.save("dark");
    expect(theme.load()).toBe("dark");
    theme.save("light");
    expect(theme.load()).toBe("light");
    theme.clear();
    expect(theme.load()).toBe(null);
  });

  it("ignores a stored value outside the set", () => {
    localStorage.setItem("app.theme", "sepia");
    expect(theme.load()).toBe(null);
  });

  it("exposes its key and values so a pre-paint script or test can seed it", () => {
    expect(theme.key).toBe("app.theme");
    expect(theme.values).toEqual(["light", "dark"]);
  });
});

describe("createFlagStore", () => {
  const collapsed = createFlagStore("app.speed-tips-collapsed");

  it("defaults to off and round-trips an on state", () => {
    expect(collapsed.load()).toBe(false);
    collapsed.save(true);
    expect(collapsed.load()).toBe(true);
    collapsed.save(false);
    expect(collapsed.load()).toBe(false);
    expect(localStorage.getItem("app.speed-tips-collapsed")).toBe(null);
  });
});

// Private-mode browsers (and some embedded webviews) throw on any localStorage access; every store
// must degrade to its default instead of crashing the app.
describe("stores when localStorage itself throws", () => {
  beforeEach(() => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("each falls back to its default and warns instead of throwing", () => {
    const json = createJsonStore<{ a: number }>("j");
    const choice = createChoiceStore("c", ["x", "y"]);
    const flag = createFlagStore("f");
    expect(json.load()).toBe(null);
    expect(choice.load()).toBe(null);
    expect(flag.load()).toBe(false);
    expect(() => json.save({ a: 1 })).not.toThrow();
    expect(() => choice.save("x")).not.toThrow();
    expect(() => flag.save(true)).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith("Could not save c:", expect.any(Error));
  });
});
