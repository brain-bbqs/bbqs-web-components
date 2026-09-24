// Domain types for talking to the archive. Kept independent of any UI: nothing here touches the DOM.

/** Where an archive instance's API, web front end and OAuth endpoints live. */
export interface DandiInstance {
  api: string;
  web: string;
  oauth: string;
}

/** What the API helpers take: the instance, the caller's token (empty when signed out) and the
 * dataset the call concerns. Named `UploaderConfig` in bbqs-uploader and `ArchiveConfig` in
 * clip-extractor; the two were identical. */
export interface ArchiveConfig {
  api: string;
  web: string;
  accessToken: string;
  dandisetId: string;
  /** Whether the selected dandiset is embargoed, if known. Undefined when not yet resolved. */
  embargoed?: boolean;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  /** ms since epoch */
  expiresAt: number;
}

/** The slice of an app's stored settings the archive client owns. Apps extend it with their own
 * fields (a delivery mode, a timeline window) and store the whole through one JSON store. */
export interface StoredArchiveSettings {
  dandisetId?: string;
  oauth?: OAuthTokenSet;
}

/** One slice of a blob in the S3 multipart layout: `number` is 1-based, like S3's part numbers. */
export interface FilePart {
  number: number;
  offset: number;
  size: number;
}

export interface ServerPart {
  part_number: number;
  size: number;
  upload_url: string;
}

export interface UploadInitResponse {
  upload_id: string;
  parts: ServerPart[];
}

export interface CompletedPart {
  part_number: number;
  size: number;
  etag: string;
}

export interface Asset {
  asset_id: string;
  path: string;
}
