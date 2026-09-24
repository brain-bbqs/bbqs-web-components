import { afterEach, describe, expect, it } from "vitest";
import { throwingStorage } from "../../src/vitest/storage.js";

let restore: (() => void) | null = null;

afterEach(() => {
  restore?.();
  restore = null;
  localStorage.clear();
});

describe("throwingStorage", () => {
  it("makes every storage access throw until restored", () => {
    restore = throwingStorage();
    expect(() => localStorage.getItem("k")).toThrow("storage disabled");
    expect(() => localStorage.setItem("k", "v")).toThrow("storage disabled");
    expect(() => localStorage.removeItem("k")).toThrow("storage disabled");
    expect(() => localStorage.clear()).toThrow("storage disabled");
    expect(() => localStorage.key(0)).toThrow("storage disabled");
    expect(() => sessionStorage.getItem("k")).toThrow("storage disabled");
    restore();
    restore = null;
    expect(localStorage.getItem("k")).toBe(null);
    localStorage.setItem("k", "v");
    expect(localStorage.getItem("k")).toBe("v");
  });

  it("takes a custom message", () => {
    restore = throwingStorage("quota exceeded");
    expect(() => localStorage.setItem("k", "v")).toThrow("quota exceeded");
  });
});
