export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** What to say for the HTTP statuses a person can act on. */
export type FriendlyMessages = Partial<Record<401 | 403 | 404, string>>;

export const DEFAULT_FRIENDLY_MESSAGES: Required<FriendlyMessages> = {
  401: "Authentication failed: please sign out and sign in again.",
  403: "Permission denied: your account cannot edit this dataset.",
  404: "Not found: check that the dataset still exists and has a draft version.",
};

/**
 * Turns an archive failure into something a person can act on, rather than a bare status line.
 * Each app passes its own wording where it differs from the defaults (bbqs-uploader says
 * "dandiset", clip-extractor says "add assets to this dataset"); anything else falls through as
 * its own message.
 */
export function friendlyError(e: unknown, messages: FriendlyMessages = {}): string {
  if (e instanceof ApiError) {
    const status = e.status as 401 | 403 | 404;
    const message = messages[status] ?? DEFAULT_FRIENDLY_MESSAGES[status];
    if (message) return message;
  }
  return e instanceof Error ? e.message : String(e);
}
