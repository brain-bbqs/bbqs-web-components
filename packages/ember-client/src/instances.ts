import type { DandiInstance } from "./types.js";

export const EMBER_INSTANCE: DandiInstance = {
  api: "https://api-dandi.emberarchive.org/api",
  web: "https://dandi.emberarchive.org",
  oauth: "https://api-dandi.emberarchive.org/oauth",
};

/**
 * A small companion service (not part of any of these repos) that holds the real BBQS/EMBER admin
 * roster server-side and answers only "yes/no" per dandiset, so the roster itself never ships to
 * the browser. bbqs-uploader introduced it (brain-bbqs/bbqs-uploader#65): hashing a small,
 * semi-public username space client-side does not actually keep it confidential, only a
 * server-side check does.
 */
export const ADMIN_CHECK_BASE_URL = "https://uploader-codycbakerphd.pythonanywhere.com";

// Each app registers its own public (PKCE, no client secret) OAuth2 application on the archive,
// deliberately kept separate so the tools can be revoked and audited independently. The client id
// therefore stays in the app (see createOAuthClient), not here.
