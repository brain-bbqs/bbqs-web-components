import type { ArchiveConfig } from "../../src/types.js";

export const cfg: ArchiveConfig = {
  api: "https://api.example.org/api",
  web: "https://example.org",
  accessToken: "tok",
  dandisetId: "000123",
};

/** A Response-shaped stub carrying a JSON body. */
export function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}
