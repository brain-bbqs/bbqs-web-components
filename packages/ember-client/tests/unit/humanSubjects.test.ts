import { afterEach, describe, expect, it, vi } from "vitest";
import { HUMAN_SUBJECTS_PHRASE, containsHumanSubjects, fetchDraftMetadata } from "../../src/humanSubjects.js";
import { cfg, jsonResponse } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("containsHumanSubjects", () => {
  it("finds the marker phrase anywhere in the draft description", () => {
    expect(
      containsHumanSubjects({ description: `Staging dataset. ${HUMAN_SUBJECTS_PHRASE}. Ask before sharing.` }),
    ).toBe(true);
  });

  it("is case-sensitive, so an ordinary mention of human subjects is not a flag", () => {
    expect(containsHumanSubjects({ description: "This dataset contains human subjects data." })).toBe(false);
  });

  it("treats a missing description, or missing metadata, as unflagged", () => {
    expect(containsHumanSubjects({ description: "Mouse ephys recordings" })).toBe(false);
    expect(containsHumanSubjects({})).toBe(false);
    expect(containsHumanSubjects(null)).toBe(false);
  });
});

describe("fetchDraftMetadata", () => {
  it("reads the selected dandiset's draft version with the bearer token", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ name: "Incoming: Test Lab", description: HUMAN_SUBJECTS_PHRASE })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const metadata = await fetchDraftMetadata(cfg);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.org/api/dandisets/000123/versions/draft/");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(containsHumanSubjects(metadata)).toBe(true);
  });
});
