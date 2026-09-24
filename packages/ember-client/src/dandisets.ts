import type { ArchiveConfig } from "./types.js";
import { apiFetch, listedTitle, type DandisetListResponse } from "./api.js";
import { ADMIN_CHECK_BASE_URL } from "./instances.js";

export interface IncomingDandiset {
  identifier: string;
  title: string;
  embargoed: boolean;
}

export interface IncomingDandisetsResult {
  datasets: IncomingDandiset[];
  /**
   * How many "Incoming: " candidates were dropped because their admin-owner check could not be
   * completed at all (service down, CORS, network), as opposed to answering "no". Reported so the
   * UI can say "couldn't verify" instead of the indistinguishable "you have no datasets".
   */
  unverified: number;
}

export interface ListIncomingOptions {
  /** The admin-check service to ask; overridable for tests. */
  adminCheckBaseUrl?: string;
  /** Hears about a check that could not complete. Defaults to `console.warn`. */
  onUnverified?: (identifier: string, error: unknown) => void;
}

/** The BBQS convention for a lab's staging dataset. */
export const INCOMING_PREFIX = "Incoming: ";

interface AdminOwnedResponse {
  adminOwned: boolean;
}

/**
 * Whether a BBQS/EMBER admin is a listed owner of the given dandiset, per the admin-check service.
 *
 * Deliberately unauthenticated: the service reads the owner list with its own archive credentials,
 * so the signed-in user's access token never leaves the archive and this origin. Don't add an
 * `Authorization` header here without re-reading the apps' SECURITY.md: forwarding a live token to
 * a host these repos don't control is the exact trade this call was rewritten to avoid.
 */
async function hasAdminOwner(baseUrl: string, identifier: string): Promise<boolean> {
  const resp = await fetch(`${baseUrl}/admin-owned/${identifier}`);
  if (!resp.ok) {
    throw new Error(`GET /admin-owned/${identifier} failed with HTTP ${resp.status}`);
  }
  const body = (await resp.json()) as AdminOwnedResponse;
  return body.adminOwned === true;
}

/**
 * Dandisets the signed-in user owns whose title starts with "Incoming: " and that are also
 * co-owned by a BBQS/EMBER admin, so an arbitrary DANDI user can't self-provision an "Incoming: "
 * dataset to use these tools unsupervised. page_size=1000 is the archive's max page size and
 * comfortably covers any one user's owned dandisets, so further pages are never followed.
 */
export async function listIncomingDandisets(
  cfg: ArchiveConfig,
  { adminCheckBaseUrl = ADMIN_CHECK_BASE_URL, onUnverified = warnUnverified }: ListIncomingOptions = {},
): Promise<IncomingDandisetsResult> {
  const resp = await apiFetch<DandisetListResponse>(cfg, "/dandisets/?user=me&embargoed=true&page_size=1000");
  const candidates = (resp?.results ?? [])
    .map((d) => ({
      identifier: d.identifier,
      title: listedTitle(d),
      embargoed: d.embargo_status === "EMBARGOED",
    }))
    .filter((d) => d.title.startsWith(INCOMING_PREFIX));

  // Fail closed: a dandiset whose owner list can't be confirmed is excluded rather than shown.
  // null (the check never completed) is tracked apart from false (it completed and said no), so a
  // service outage doesn't masquerade as "you own no incoming datasets".
  const checks = await Promise.all(
    candidates.map((d) =>
      hasAdminOwner(adminCheckBaseUrl, d.identifier).catch((e: unknown) => {
        onUnverified(d.identifier, e);
        return null;
      }),
    ),
  );

  return {
    datasets: candidates.filter((_, i) => checks[i] === true).sort((a, b) => a.title.localeCompare(b.title)),
    unverified: checks.filter((c) => c === null).length,
  };
}

function warnUnverified(identifier: string, e: unknown): void {
  console.warn(`Could not verify admin ownership of dandiset ${identifier}:`, e);
}
