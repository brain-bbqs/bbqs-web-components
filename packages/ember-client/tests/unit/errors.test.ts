import { describe, expect, it } from "vitest";
import { ApiError, DEFAULT_FRIENDLY_MESSAGES, friendlyError } from "../../src/errors.js";

describe("ApiError", () => {
  it("carries the HTTP status alongside the message, named as its own error type", () => {
    const e = new ApiError("GET /info failed", 500);
    expect(e.message).toBe("GET /info failed");
    expect(e.status).toBe(500);
    expect(e.name).toBe("ApiError");
    expect(e).toBeInstanceOf(Error);
  });
});

describe("friendlyError", () => {
  it("turns a 401 into the one action that fixes it: signing out and back in", () => {
    expect(friendlyError(new ApiError("GET /users/me/ failed with HTTP 401", 401))).toBe(
      DEFAULT_FRIENDLY_MESSAGES[401],
    );
  });

  it("explains a 403 and a 404 in the default wording", () => {
    expect(friendlyError(new ApiError("x", 403))).toBe("Permission denied: your account cannot edit this dataset.");
    expect(friendlyError(new ApiError("x", 404))).toBe(
      "Not found: check that the dataset still exists and has a draft version.",
    );
  });

  it("takes an app's own wording for any of the three statuses, keeping the defaults for the rest", () => {
    const messages = { 403: "Permission denied: your account cannot add assets to this dataset." };
    expect(friendlyError(new ApiError("x", 403), messages)).toBe(messages[403]);
    expect(friendlyError(new ApiError("x", 401), messages)).toBe(DEFAULT_FRIENDLY_MESSAGES[401]);
  });

  it("passes any other API failure through as its own message", () => {
    expect(friendlyError(new ApiError("PUT /assets/ failed with HTTP 500", 500))).toBe(
      "PUT /assets/ failed with HTTP 500",
    );
  });

  it("passes a plain Error through as its own message", () => {
    expect(friendlyError(new Error("network down"))).toBe("network down");
  });

  it("stringifies whatever else was thrown, rather than showing [object Object]", () => {
    expect(friendlyError("just a string")).toBe("just a string");
    expect(friendlyError(42)).toBe("42");
  });
});
