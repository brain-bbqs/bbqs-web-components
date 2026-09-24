import { describe, expect, it } from "vitest";
import { InterruptedError, isInterruption, throwIfInterrupted } from "../../src/interrupt.js";

describe("InterruptedError", () => {
  it("is an Error named for what it is, with a default message", () => {
    const e = new InterruptedError();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("InterruptedError");
    expect(e.message).toBe("Stopped.");
    expect(new InterruptedError("Halted").message).toBe("Halted");
  });
});

describe("isInterruption", () => {
  it("recognises its own error", () => {
    expect(isInterruption(new InterruptedError())).toBe(true);
  });

  it("recognises the aborts fetch, ffmpeg.wasm and mediabunny raise for the same reason, by name", () => {
    expect(isInterruption({ name: "AbortError" })).toBe(true);
    expect(isInterruption({ name: "ConversionCanceledError" })).toBe(true);
  });

  it("does not mistake a failure, or a non-object, for a stop", () => {
    expect(isInterruption(new Error("boom"))).toBe(false);
    expect(isInterruption({ name: "TypeError" })).toBe(false);
    expect(isInterruption("AbortError")).toBe(false);
    expect(isInterruption(null)).toBe(false);
  });
});

describe("throwIfInterrupted", () => {
  it("does nothing without a signal or with one not yet tripped", () => {
    expect(() => throwIfInterrupted()).not.toThrow();
    expect(() => throwIfInterrupted(new AbortController().signal)).not.toThrow();
  });

  it("throws once the signal is tripped", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfInterrupted(controller.signal)).toThrow(InterruptedError);
  });
});
