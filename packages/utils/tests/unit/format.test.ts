import { describe, expect, it } from "vitest";
import {
  bytes,
  bytesPerSecToMBps,
  errorMessage,
  fmtBytes,
  formatBytes,
  friendlyEta,
  humanSize,
  initialsFrom,
} from "../../src/format.js";

describe("formatBytes", () => {
  it("climbs the binary ladder with the default decimals", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1048576)).toBe("5.00 MB");
  });

  it("takes a custom ladder, placeholder and ceiling", () => {
    expect(formatBytes(null, { placeholder: "n/a" })).toBe("n/a");
    expect(formatBytes(3 * 1024 ** 4, { maxUnitIndex: 3 })).toBe("3072.00 GB");
    expect(formatBytes(1536, { decimals: () => 3 })).toBe("1.500 KB");
  });
});

// clip-extractor's `bytes`, tests carried over verbatim so its readouts do not change.
describe("bytes", () => {
  it("scales through B, KB and MB", () => {
    expect(bytes(512)).toBe("512 B");
    expect(bytes(2048)).toBe("2.0 KB");
    expect(bytes(5 * 1048576)).toBe("5.00 MB");
  });

  it("carries on into GB and TB, rather than counting a huge file in megabytes", () => {
    expect(bytes(10.6 * 1024 ** 3)).toBe("10.60 GB");
    expect(bytes(360464443754)).toBe("335.71 GB");
    expect(bytes(3 * 1024 ** 4)).toBe("3.00 TB");
  });

  it("changes unit exactly at each multiple", () => {
    expect(bytes(1023)).toBe("1023 B");
    expect(bytes(1024)).toBe("1.0 KB");
    expect(bytes(1024 ** 2 - 1)).toBe("1024.0 KB");
    expect(bytes(1024 ** 2)).toBe("1.00 MB");
    expect(bytes(1024 ** 3 - 1)).toBe("1024.00 MB");
    expect(bytes(1024 ** 3)).toBe("1.00 GB");
    expect(bytes(1024 ** 4)).toBe("1.00 TB");
  });

  it("has nothing to show for nothing", () => {
    expect(bytes(null)).toBe("—");
    expect(bytes(undefined)).toBe("—");
  });
});

// encoding-helper's `fmtBytes`.
describe("fmtBytes", () => {
  it("returns the placeholder for null/undefined", () => {
    expect(fmtBytes(null)).toBe("–");
    expect(fmtBytes(undefined)).toBe("–");
  });

  it("formats bytes, kilobytes and megabytes with one decimal, gigabytes with two", () => {
    expect(fmtBytes(512)).toBe("512 B");
    expect(fmtBytes(2048)).toBe("2.0 KB");
    expect(fmtBytes(5 * 1048576)).toBe("5.0 MB");
    expect(fmtBytes(2.5 * 1073741824)).toBe("2.50 GB");
  });

  it("stays in gigabytes above a terabyte, as the app always has", () => {
    expect(fmtBytes(2 * 1024 ** 4)).toBe("2048.00 GB");
  });
});

// bbqs-uploader's `humanSize`.
describe("humanSize", () => {
  it("formats bytes with the right unit", () => {
    expect(humanSize(500)).toBe("500 B");
    expect(humanSize(1536)).toBe("1.5 KB");
    expect(humanSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("drops the decimal once the value reaches two digits", () => {
    expect(humanSize(48 * 1024 ** 3)).toBe("48 GB");
    expect(humanSize(3 * 1024 ** 4)).toBe("3.0 TB");
  });
});

describe("bytesPerSecToMBps", () => {
  it("converts using decimal (1 MB = 1,000,000 B) megabytes", () => {
    expect(bytesPerSecToMBps(1_000_000)).toBe(1);
    expect(bytesPerSecToMBps(12_500_000)).toBe(12.5);
    expect(bytesPerSecToMBps(0)).toBe(0);
  });

  it("rounds to two decimal places", () => {
    expect(bytesPerSecToMBps(1_234_567)).toBe(1.23);
  });
});

describe("initialsFrom", () => {
  it("takes the first letter of the first and last word, matching the main archive's convention", () => {
    expect(initialsFrom("Cody Baker")).toBe("CB");
    expect(initialsFrom("Cody C Baker")).toBe("CB");
    expect(initialsFrom("  cody   baker  ")).toBe("CB");
    expect(initialsFrom("Ada Byron King Lovelace")).toBe("AL");
  });

  it("falls back to '??' for an empty or single-word name", () => {
    expect(initialsFrom("")).toBe("??");
    expect(initialsFrom("cbaker")).toBe("??");
    expect(initialsFrom("  ")).toBe("??");
  });
});

describe("friendlyEta", () => {
  it("keeps very short estimates vague", () => {
    expect(friendlyEta(0)).toBe("a few seconds");
    expect(friendlyEta(9)).toBe("a few seconds");
  });

  it("rounds sub-minute estimates to 5 seconds", () => {
    expect(friendlyEta(12)).toBe("~10 seconds");
    expect(friendlyEta(42)).toBe("~40 seconds");
  });

  it("promotes near-minute and sub-hour estimates to minutes", () => {
    expect(friendlyEta(58)).toBe("~1 minute");
    expect(friendlyEta(170)).toBe("~3 minutes");
    expect(friendlyEta(59.4 * 60)).toBe("~59 minutes");
  });

  it("formats hour-scale estimates as hours and minutes", () => {
    expect(friendlyEta(59.5 * 60)).toBe("~1 hour");
    expect(friendlyEta(3650)).toBe("~1 hour 1 minute");
    expect(friendlyEta(3900)).toBe("~1 hour 5 minutes");
    expect(friendlyEta(2 * 3600)).toBe("~2 hours");
  });

  it("caps very large estimates instead of displaying an unbounded hour count", () => {
    expect(friendlyEta(12 * 3600)).toBe("> 12 hours");
    expect(friendlyEta(30 * 3600)).toBe("> 12 hours");
    expect(friendlyEta(11 * 3600)).toBe("~11 hours");
  });

  it("falls back to a placeholder for non-finite or negative input", () => {
    expect(friendlyEta(NaN)).toBe("—");
    expect(friendlyEta(Infinity)).toBe("—");
    expect(friendlyEta(-5)).toBe("—");
  });
});

describe("errorMessage", () => {
  it("takes an Error's own message and stringifies anything else", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
    expect(errorMessage(42)).toBe("42");
  });
});
