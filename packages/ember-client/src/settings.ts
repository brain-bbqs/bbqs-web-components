import { createJsonStore, type JsonStore } from "@brain-bbqs/utils";
import type { ArchiveConfig, DandiInstance, StoredArchiveSettings } from "./types.js";
import { EMBER_INSTANCE } from "./instances.js";

export interface ResolveConfigInput {
  dandisetId: string;
  oauthAccessToken?: string;
  embargoed?: boolean;
}

/**
 * The six-or-more digit dandiset id inside a label such as "(000456) Incoming: Lab", or "" when
 * there is none. A digit run preceded by a hyphen is rejected so bbqs-uploader's
 * `?test&num_datasets=N` injection's negative fake identifiers (e.g. "-000001") never resolve to a
 * plausible real dandiset id.
 */
export function extractDandisetId(raw: string): string {
  const idMatch = /(^|[^-\d])(\d{6,})/.exec(raw.trim());
  return idMatch ? idMatch[2] : "";
}

/** Resolves the archive config the API helpers take from the current sign-in + dataset choice. */
export function resolveConfig(input: ResolveConfigInput, instance: DandiInstance = EMBER_INSTANCE): ArchiveConfig {
  return {
    api: instance.api,
    web: instance.web,
    accessToken: input.oauthAccessToken ?? "",
    dandisetId: extractDandisetId(input.dandisetId),
    embargoed: input.embargoed,
  };
}

/** What stands between a config and an upload, in the words the apps show. */
export function configProblems(cfg: ArchiveConfig): string[] {
  const problems: string[] = [];
  if (!cfg.api || !/^https?:\/\//.test(cfg.api)) problems.push("API base URL is missing or invalid.");
  if (!cfg.accessToken) problems.push("Not signed in.");
  else if (!cfg.dandisetId) problems.push("No dataset selected.");
  return problems;
}

/**
 * The app's stored settings (the picked dataset, the OAuth tokens, and whatever else the app adds
 * to `T`) under one localStorage key, e.g. "bbqs-uploader.settings.v1".
 *
 * The apps are fully static, backend-free pages with no server to hold a session, so client
 * storage is the only place to persist the OAuth token between page loads. This is an accepted,
 * documented trade-off; see each app's SECURITY.md ("Handling a 'clear text storage' alert on a new
 * credential"). The key is also what the pre-paint script (@brain-bbqs/config/pre-paint) reads.
 */
export function createArchiveSettingsStore<T extends StoredArchiveSettings = StoredArchiveSettings>(
  storageKey: string,
): JsonStore<T> {
  // codeql[js/clear-text-storage-of-sensitive-data]
  return createJsonStore<T>(storageKey);
}
