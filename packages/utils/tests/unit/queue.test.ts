import { describe, expect, it } from "vitest";
import { runQueue } from "../../src/queue.js";

describe("runQueue", () => {
  it("runs every item exactly once, passing each item's index", async () => {
    const seen: [string, number][] = [];
    await runQueue(["a", "b", "c"], 2, (item, index) => {
      seen.push([item, index]);
      return Promise.resolve();
    });
    expect(seen.sort()).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("never runs more than `limit` workers at once", async () => {
    let inFlight = 0;
    let peak = 0;
    await runQueue(
      Array.from({ length: 10 }, (_, i) => i),
      3,
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
      },
    );
    expect(peak).toBe(3);
  });

  it("completes without workers when there are no items", async () => {
    let calls = 0;
    await runQueue([], 4, () => {
      calls++;
      return Promise.resolve();
    });
    expect(calls).toBe(0);
  });

  it("rejects when a worker rejects", async () => {
    await expect(
      runQueue([1, 2, 3], 1, (n) => (n === 2 ? Promise.reject(new Error("boom")) : Promise.resolve())),
    ).rejects.toThrow("boom");
  });
});
