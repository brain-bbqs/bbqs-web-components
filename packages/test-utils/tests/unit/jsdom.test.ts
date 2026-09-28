import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installCanvasStub,
  installDialogPolyfill,
  installExecCommand,
  installMatchMedia,
  installObserverStub,
  stubClipboard,
} from "../../src/vitest/jsdom.js";

afterEach(() => {
  document.body.innerHTML = "";
});

/** A property's own value, read without detaching a method from its object. */
function own(target: object, name: string): unknown {
  return Object.getOwnPropertyDescriptor(target, name)?.value;
}

describe("installMatchMedia", () => {
  it("answers every query the same way, and restores the absence of matchMedia", () => {
    expect(own(globalThis, "matchMedia")).toBe(undefined);
    const restore = installMatchMedia();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    expect(mql.matches).toBe(false);
    expect(mql.media).toBe("(prefers-color-scheme: dark)");
    mql.addEventListener("change", () => {});
    mql.removeEventListener("change", () => {});
    mql.addListener(() => {});
    mql.removeListener(() => {});
    expect(mql.dispatchEvent(new Event("change"))).toBe(false);
    restore();
    expect(own(globalThis, "matchMedia")).toBe(undefined);
  });

  it("takes a fixed answer or a per-query one", () => {
    const restoreDark = installMatchMedia(true);
    expect(window.matchMedia("(prefers-color-scheme: dark)").matches).toBe(true);
    restoreDark();
    const restore = installMatchMedia((q) => q.includes("reduce"));
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
    expect(window.matchMedia("(prefers-color-scheme: dark)").matches).toBe(false);
    restore();
  });

  it("puts back a matchMedia that was already there", () => {
    const mine = (): MediaQueryList => ({ matches: true }) as MediaQueryList;
    Object.defineProperty(globalThis, "matchMedia", { value: mine, configurable: true, writable: true });
    const restore = installMatchMedia(false);
    expect(window.matchMedia("x").matches).toBe(false);
    restore();
    expect(own(globalThis, "matchMedia")).toBe(mine);
    delete (globalThis as { matchMedia?: unknown }).matchMedia;
  });
});

describe("installDialogPolyfill", () => {
  function dialog(): HTMLDialogElement {
    const d = document.createElement("dialog");
    document.body.append(d);
    return d;
  }

  it("adds showModal and close where jsdom lacks them, and takes them away again", () => {
    expect(typeof dialog().showModal).toBe("undefined");
    const restore = installDialogPolyfill();
    const d = dialog();
    const closed = vi.fn();
    d.addEventListener("close", closed);
    d.showModal();
    d.showModal();
    expect(d.open).toBe(true);
    d.close("done");
    expect(d.open).toBe(false);
    expect(d.returnValue).toBe("done");
    expect(closed).toHaveBeenCalledTimes(1);
    // Closing a closed dialog fires nothing.
    d.close();
    expect(closed).toHaveBeenCalledTimes(1);
    restore();
    expect(typeof d.showModal).toBe("undefined");
    expect(typeof d.close).toBe("undefined");
  });

  it("closes the topmost modal on Escape, after a cancel it may prevent", () => {
    const restore = installDialogPolyfill();
    const lower = dialog();
    const upper = dialog();
    lower.showModal();
    upper.showModal();
    upper.addEventListener("cancel", (e) => e.preventDefault(), { once: true });

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(upper.open).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(upper.open).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(upper.open).toBe(false);
    expect(lower.open).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(lower.open).toBe(false);
    // Nothing modal is left open, so Escape does nothing.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    // A dialog opened by attribute rather than showModal() is not modal: Escape leaves it.
    const plain = dialog();
    plain.open = true;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(plain.open).toBe(true);
    plain.close();
    expect(plain.open).toBe(false);
    restore();
    // The keydown listener went with the rest.
    lower.setAttribute("open", "");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(lower.open).toBe(true);
  });

  it("changes nothing where the browser already has it", () => {
    const first = installDialogPolyfill();
    const showModal = own(HTMLDialogElement.prototype, "showModal");
    const second = installDialogPolyfill();
    expect(own(HTMLDialogElement.prototype, "showModal")).toBe(showModal);
    second();
    expect(own(HTMLDialogElement.prototype, "showModal")).toBe(showModal);
    first();
  });

  it("reflects open itself where the element does not", () => {
    const proto = HTMLDialogElement.prototype;
    const reflected = Object.getOwnPropertyDescriptor(proto, "open")!;
    delete (proto as Partial<HTMLDialogElement>).open;
    try {
      const restore = installDialogPolyfill();
      const d = dialog();
      d.open = true;
      expect(d.hasAttribute("open")).toBe(true);
      expect(d.open).toBe(true);
      d.open = false;
      expect(d.hasAttribute("open")).toBe(false);
      restore();
      expect(Object.getOwnPropertyDescriptor(proto, "open")).toBe(undefined);

      // A plain data property is replaced too, and put back afterwards.
      Object.defineProperty(proto, "open", { value: false, configurable: true, writable: true });
      const again = installDialogPolyfill();
      expect(typeof Object.getOwnPropertyDescriptor(proto, "open")?.get).toBe("function");
      again();
      expect(Object.getOwnPropertyDescriptor(proto, "open")?.value).toBe(false);
    } finally {
      Object.defineProperty(proto, "open", reflected);
    }
  });
});

describe("installObserverStub", () => {
  it.each(["ResizeObserver", "IntersectionObserver", "MutationObserver"] as const)(
    "records what a %s observes and fires only when told",
    (name) => {
      const before = (globalThis as Record<string, unknown>)[name];
      const stub = installObserverStub(name);
      const seen: unknown[][] = [];
      const Ctor = (globalThis as unknown as Record<string, new (cb: (e: unknown[]) => void, o?: unknown) => unknown>)[
        name
      ];
      new Ctor((entries) => seen.push(entries), { threshold: 0.5 });
      const [observer] = stub.instances;
      expect(observer.options).toEqual({ threshold: 0.5 });
      const a = document.createElement("div");
      const b = document.createElement("div");
      observer.observe(a);
      observer.observe(b);
      observer.unobserve(a);
      expect(observer.observed).toEqual([b]);
      expect(observer.takeRecords()).toEqual([]);
      observer.fire();
      observer.fire([{ target: b }]);
      expect(seen).toEqual([[], [{ target: b }]]);
      observer.disconnect();
      expect(observer.disconnected).toBe(true);
      stub.restore();
      expect((globalThis as Record<string, unknown>)[name]).toBe(before);
    },
  );
});

describe("stubClipboard", () => {
  it("records writes, reads back the last, and removes the clipboard again", async () => {
    const clip = stubClipboard();
    expect(await navigator.clipboard.readText()).toBe("");
    await navigator.clipboard.writeText("ffmpeg -i in.mp4");
    expect(clip.writes).toEqual(["ffmpeg -i in.mp4"]);
    expect(await navigator.clipboard.readText()).toBe("ffmpeg -i in.mp4");
    clip.restore();
    expect(navigator.clipboard).toBe(undefined);
  });

  it("defers to the writeText it is given, rejection included", async () => {
    const writeText = vi.fn(() => Promise.reject(new Error("denied")));
    const clip = stubClipboard(writeText);
    await expect(navigator.clipboard.writeText("x")).rejects.toThrow("denied");
    expect(writeText).toHaveBeenCalledWith("x");
    expect(clip.writes).toEqual(["x"]);
    clip.restore();
  });
});

describe("installExecCommand", () => {
  it("records each command and answers with the given result", () => {
    const exec = installExecCommand();
    expect(document.execCommand("copy")).toBe(true);
    exec.restore();
    const refusing = installExecCommand(() => false);
    expect(document.execCommand("copy")).toBe(false);
    expect(refusing.calls).toEqual(["copy"]);
    refusing.restore();
    expect("execCommand" in document).toBe(false);
  });
});

describe("installCanvasStub", () => {
  it("hands each canvas one recording 2D context, and no other kind", () => {
    const original = own(HTMLCanvasElement.prototype, "getContext");
    const stub = installCanvasStub();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    expect(canvas.getContext("2d")).toBe(ctx);
    expect(canvas.getContext("webgl")).toBe(null);
    expect(stub.contexts).toEqual([ctx]);
    expect(ctx.canvas).toBe(canvas);

    expect(ctx.fillStyle).toBe("#000000");
    ctx.fillStyle = "#ff0000";
    expect(ctx.fillStyle).toBe("#ff0000");
    ctx.fillRect(0, 0, 10, 10);
    expect(ctx.measureText("abcd").width).toBe(24);
    const data = ctx.getImageData(0, 0, 2, 3);
    expect([data.width, data.height, data.data.length]).toEqual([2, 3, 24]);
    expect(ctx.createImageData(1, 1).data.length).toBe(4);
    expect(() => ctx.createLinearGradient(0, 0, 1, 1).addColorStop(0, "red")).not.toThrow();
    expect(() => ctx.createRadialGradient(0, 0, 1, 1, 1, 2).addColorStop(0, "red")).not.toThrow();
    expect(() => ctx.createConicGradient(0, 0, 0).addColorStop(0, "red")).not.toThrow();
    expect(() => ctx.createPattern(canvas, "repeat")!.setTransform()).not.toThrow();
    expect(ctx.isPointInPath(1, 1)).toBe(false);
    expect(ctx.isPointInStroke(1, 1)).toBe(false);
    expect(ctx.getLineDash()).toEqual([]);
    expect(ctx.getTransform().a).toBe(1);
    // A symbol key (as a spread or an inspection would read) is simply absent.
    expect((ctx as unknown as Record<symbol, unknown>)[Symbol.iterator]).toBe(undefined);
    (ctx as unknown as Record<symbol, unknown>)[Symbol.iterator] = 1;

    expect(stub.calls.map((c) => c.name)).toEqual([
      "set:fillStyle",
      "fillRect",
      "measureText",
      "getImageData",
      "createImageData",
      "createLinearGradient",
      "createRadialGradient",
      "createConicGradient",
      "createPattern",
      "isPointInPath",
      "isPointInStroke",
      "getLineDash",
      "getTransform",
    ]);
    expect(stub.calls[1].args).toEqual([0, 0, 10, 10]);
    stub.restore();
    expect(own(HTMLCanvasElement.prototype, "getContext")).toBe(original);
  });

  it("gives separate canvases separate contexts that share one call log", () => {
    const stub = installCanvasStub();
    const a = document.createElement("canvas").getContext("2d")!;
    const b = document.createElement("canvas").getContext("2d")!;
    expect(a).not.toBe(b);
    a.save();
    b.restore();
    expect(stub.calls.map((c) => c.name)).toEqual(["save", "restore"]);
    stub.restore();
  });
});
