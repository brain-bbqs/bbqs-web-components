import type { ArchiveConfig } from "./types.js";
import { ApiError } from "./errors.js";

export interface ApiFetchOptions {
  method?: string;
  json?: unknown;
}

/** Bearer-authenticated JSON call against the archive's REST API. */
export async function apiFetch<T = unknown>(
  cfg: ArchiveConfig,
  path: string,
  { method = "GET", json }: ApiFetchOptions = {},
): Promise<T | null> {
  // Omitted rather than sent empty: an anonymous call (no `accessToken`) has to reach the archive's
  // public endpoints as a real anonymous request. `Authorization: Bearer ` with nothing after it is
  // still a credential as far as the archive's auth middleware is concerned; it rejects the empty
  // token outright instead of falling back to anonymous access, which would 401 every signed-out
  // caller, including clip-extractor's public dandiset listing.
  const headers: Record<string, string> = cfg.accessToken ? { Authorization: `Bearer ${cfg.accessToken}` } : {};
  let body: string | undefined;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  let resp: Response;
  try {
    resp = await fetch(`${cfg.api}${path}`, { method, headers, body });
  } catch (e) {
    throw new ApiError(
      `Network error calling ${path}. Check your connection (or the server's CORS policy): ${
        e instanceof Error ? e.message : String(e)
      }`,
      0,
    );
  }
  if (!resp.ok) {
    let detail = "";
    try {
      detail = await resp.text();
    } catch {
      /* ignore */
    }
    throw new ApiError(
      `${method} ${path} failed with HTTP ${resp.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`,
      resp.status,
    );
  }
  if (resp.status === 204) return null;
  return (await resp.json()) as T;
}

/** The slice of the archive's dandiset-listing response the picker (upload destinations) and a
 * browse pane (what a signed-in visitor may see) both read. */
export interface DandisetListItem {
  identifier: string;
  embargo_status?: string;
  draft_version?: { name?: string };
  most_recent_published_version?: { name?: string };
}

export interface DandisetListResponse {
  results?: DandisetListItem[];
  next?: string | null;
}

/** A listed dandiset's title: the published name where there is one, else the draft's, else nothing.
 * Every dandiset has a draft; only some have been published, and a published name is the more
 * considered of the two. */
export function listedTitle(item: DandisetListItem): string {
  return item.most_recent_published_version?.name ?? item.draft_version?.name ?? "";
}

/** The path to ask {@link apiFetch} for next, from the absolute `next` URL a paged response carries.
 * Null both when there is no next page and when it points somewhere other than this archive, which
 * is not ours to follow. */
export function nextPagePath(cfg: ArchiveConfig, next: string | null | undefined): string | null {
  return next && next.startsWith(cfg.api) ? next.slice(cfg.api.length) : null;
}

/**
 * When a request dies with a network/CORS error, probes the API two ways to pinpoint which layer of
 * the server's CORS setup is broken. Browsers do not let a page inspect another origin's CORS
 * headers directly, so this differential probe is the best client-side diagnosis available.
 */
export async function diagnoseCors(cfg: ArchiveConfig, origin: string = window.location.origin): Promise<string> {
  const probe = async (headers: Record<string, string>) => {
    try {
      const r = await fetch(`${cfg.api}/info/`, { headers });
      return r.status > 0; // readable response of any status = CORS passed
    } catch {
      return false;
    }
  };
  const simple = await probe({}); // no preflight needed
  const preflighted = await probe({ Authorization: `Bearer ${cfg.accessToken}` });
  if (!simple && !preflighted) {
    return (
      `CORS diagnosis: the API refuses ALL cross-origin requests from ${origin}. ` +
      "The instance operators must add this origin to the server's CORS allowlist " +
      "(DJANGO_CORS_ALLOWED_ORIGINS / DJANGO_CORS_ALLOWED_ORIGIN_REGEXES)."
    );
  }
  if (!preflighted) {
    return (
      `CORS diagnosis: simple requests from ${origin} pass, but preflighted (OPTIONS) ` +
      "requests are rejected. The API's CORS layer is not answering preflights for this origin."
    );
  }
  // GETs pass: check whether POSTs fail across the board or only the upload endpoint, using a
  // harmless read-only POST (/blobs/digest/ lookup).
  let postPasses = false;
  try {
    const r = await fetch(`${cfg.api}/blobs/digest/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        algorithm: "dandi:dandi-etag",
        value: `${"0".repeat(32)}-1`,
      }),
    });
    postPasses = r.status > 0;
  } catch {
    postPasses = false;
  }
  if (postPasses) {
    return (
      `CORS diagnosis: GET requests AND other POST requests from ${origin} pass CORS, ` +
      "but the upload-initialize response came back without an Access-Control-Allow-Origin " +
      "header. A proxy/WAF rule specific to the /uploads/ path on the API server is the " +
      "likely culprit. This can only be fixed by the instance operators."
    );
  }
  return (
    `CORS diagnosis: reads work but writes are blocked. dandi-archive servers allow ` +
    "GET/HEAD/OPTIONS from ANY origin (the cors_allow_anyone_read_only hook) but only " +
    `add CORS headers to write responses for allowlisted origins, and ${origin} is not ` +
    "in this server's DJANGO_CORS_ALLOWED_ORIGINS. Ask the instance operators to add " +
    "this origin to that allowlist (for DANDI itself: the allowed_external_services " +
    "list in dandi-infrastructure's terraform/main.tf)."
  );
}
