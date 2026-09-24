// Display-formatting helpers. The three apps each grew their own byte formatter with a slightly
// different ladder; formatBytes is the one implementation, and the three named presets below keep
// each app's readouts exactly as they were so adopting the package changes no rendered string.

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export interface FormatBytesOptions {
  /** Decimal places for a value in the unit at `unitIndex` (0 = B, 1 = KB, ...). */
  decimals?: (unitIndex: number, value: number) => number;
  /** Shown for null/undefined. */
  placeholder?: string;
  /** Largest unit index the ladder climbs to (default 4, TB). */
  maxUnitIndex?: number;
  /**
   * Print a count under 1 KB exactly as given (`512.37 B`) instead of rounding it with
   * `decimals(0, ...)`. clip-extractor's and encoding-helper's formatters always did.
   */
  exactBytes?: boolean;
}

/**
 * Formats a byte count on a binary (1024) ladder from B up to TB, or the placeholder for
 * null/undefined. The default ladder is clip-extractor's: whole bytes, one decimal of KB, two of
 * everything above, and it runs to terabytes because an archived recording can be hundreds of
 * gigabytes and stopping at megabytes renders one of those as six figures of MB.
 */
export function formatBytes(n: number | null | undefined, options: FormatBytesOptions = {}): string {
  const {
    decimals = (i) => (i === 0 ? 0 : i === 1 ? 1 : 2),
    placeholder = "—",
    maxUnitIndex = UNITS.length - 1,
    exactBytes = false,
  } = options;
  if (n == null) return placeholder;
  let value = n;
  let i = 0;
  while (value >= 1024 && i < maxUnitIndex) {
    value /= 1024;
    i++;
  }
  if (i === 0 && exactBytes) return `${value} B`;
  return `${value.toFixed(decimals(i, value))} ${UNITS[i]}`;
}

// clip-extractor's and encoding-helper's formatters were threshold chains in which NaN fails every
// `n < limit` test and lands in the top unit; the ladder above would leave it in bytes.
function topUnitForNaN(maxUnitIndex: number): string {
  return `NaN ${UNITS[maxUnitIndex]}`;
}

/** clip-extractor's convention: `bytes(360464443754)` is "335.71 GB". */
export function bytes(n: number | null | undefined): string {
  if (Number.isNaN(n)) return topUnitForNaN(UNITS.length - 1);
  return formatBytes(n, { exactBytes: true });
}

/** encoding-helper's convention: one decimal through MB, two of GB, no TB, an en dash for nothing. */
export function fmtBytes(n: number | null | undefined): string {
  if (Number.isNaN(n)) return topUnitForNaN(3);
  return formatBytes(n, { decimals: (i) => (i === 3 ? 2 : 1), placeholder: "–", maxUnitIndex: 3, exactBytes: true });
}

/** bbqs-uploader's convention: one decimal below 10, none above, so a column of sizes stays narrow. */
export function humanSize(n: number): string {
  return formatBytes(n, { decimals: (i, value) => (value >= 10 || i === 0 ? 0 : 1) });
}

/** Decimal (1 MB = 1,000,000 B) megabytes-per-second, matching typical network-speed convention. */
export function bytesPerSecToMBps(bytesPerSec: number): number {
  return Math.round((bytesPerSec / 1_000_000) * 100) / 100;
}

/**
 * Two-letter avatar initials from a display name, matching the archive's own convention (first
 * char of the first word + first char of the last word, e.g. "Cody Baker" -> "CB"). Falls back to
 * "??" for an empty or single-word name, same as the archive.
 */
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return "??";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ETA_MAX_HOURS = 12;

/**
 * Plain-words "time left" estimate for progress chips: "a few seconds", "~40 seconds",
 * "~3 minutes", "~1 hour 5 minutes". Rounds more coarsely as the estimate grows, so the readout
 * stays calm instead of twitching on every tick. Returns "—" when no estimate is possible.
 */
export function friendlyEta(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  if (totalSeconds < 10) return "a few seconds";
  const roundedSec = Math.round(totalSeconds / 5) * 5;
  if (roundedSec < 60) return `~${roundedSec} seconds`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `~${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.floor(minutes / 60);
  if (hours >= ETA_MAX_HOURS) return `> ${ETA_MAX_HOURS} hours`;
  const remMinutes = minutes % 60;
  const hoursPart = `~${hours} ${hours === 1 ? "hour" : "hours"}`;
  return remMinutes ? `${hoursPart} ${remMinutes} ${remMinutes === 1 ? "minute" : "minutes"}` : hoursPart;
}

/** The message of whatever was thrown: an Error's own, or the value itself as text. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
