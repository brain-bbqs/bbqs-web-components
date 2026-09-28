// Stand-ins for the browser APIs jsdom lacks, which the apps' unit tests each stubbed their own
// way: matchMedia (the theme toggle), <dialog>'s showModal/close (the What's New modal), the
// Resize/Intersection/Mutation observers, the clipboard and document.execCommand. Each install
// returns a function that puts back what was there, and none depends on a test runner's mocking,
// so a vi.fn can be handed in wherever a test wants to assert on calls. Globals go on globalThis,
// which is the window under Vitest's jsdom environment.

type Restore = () => void;

/** Defines `name` on `target` and returns a function restoring whatever was there before. */
function replaceProperty(target: object, name: string, value: unknown): Restore {
  const previous = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { value, configurable: true, writable: true });
  return () => {
    if (previous) Object.defineProperty(target, name, previous);
    else delete (target as Record<string, unknown>)[name];
  };
}

/**
 * A `window.matchMedia` answering every query with `matches` (default false: a light OS theme,
 * no reduced motion), or with what `matches(query)` returns.
 */
export function installMatchMedia(matches: boolean | ((query: string) => boolean) = false): Restore {
  const answer = typeof matches === "function" ? matches : () => matches;
  const matchMedia = (query: string): MediaQueryList => ({
    matches: answer(query),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
  return replaceProperty(globalThis, "matchMedia", matchMedia);
}

interface DialogLike extends HTMLElement {
  open: boolean;
  returnValue: string;
}

/**
 * jsdom parses <dialog> and reflects `open`, but implements neither showModal() nor close(). This
 * adds both where they are missing: showModal() sets `open`, close() clears it and fires "close",
 * and Escape pressed while a dialog opened with showModal() is open fires a cancelable "cancel" on
 * it and then closes it, as a browser does. Patched on the element's own prototype, so it works
 * whichever class jsdom gives <dialog>.
 */
export function installDialogPolyfill(doc: Document = document): Restore {
  const proto = Object.getPrototypeOf(doc.createElement("dialog")) as Record<string, unknown>;
  const restores: Restore[] = [];
  const modals: DialogLike[] = [];

  if (typeof proto.showModal !== "function") {
    restores.push(
      replaceProperty(proto, "showModal", function (this: DialogLike) {
        if (this.open) return;
        this.setAttribute("open", "");
        modals.push(this);
      }),
    );
  }
  if (typeof proto.close !== "function") {
    restores.push(
      replaceProperty(proto, "close", function (this: DialogLike, returnValue?: string) {
        if (!this.hasAttribute("open")) return;
        this.removeAttribute("open");
        if (returnValue !== undefined) this.returnValue = returnValue;
        const at = modals.indexOf(this);
        if (at !== -1) modals.splice(at, 1);
        this.dispatchEvent(new Event("close"));
      }),
    );
  }
  const openDesc = Object.getOwnPropertyDescriptor(proto, "open");
  if (!openDesc?.get) {
    const previous = openDesc;
    Object.defineProperty(proto, "open", {
      configurable: true,
      get(this: HTMLElement) {
        return this.hasAttribute("open");
      },
      set(this: HTMLElement, value: boolean) {
        this.toggleAttribute("open", Boolean(value));
      },
    });
    restores.push(() => {
      if (previous) Object.defineProperty(proto, "open", previous);
      else delete proto.open;
    });
  }

  const onKeydown = (e: KeyboardEvent): void => {
    const top = modals.at(-1);
    if (e.key !== "Escape" || !top?.open) return;
    if (top.dispatchEvent(new Event("cancel", { cancelable: true }))) (top as unknown as HTMLDialogElement).close();
  };
  if (restores.length) {
    doc.addEventListener("keydown", onKeydown);
    restores.push(() => doc.removeEventListener("keydown", onKeydown));
  }
  return () => {
    for (const restore of restores.reverse()) restore();
  };
}

/** One observer a stubbed constructor built, which a test fires by hand. */
export interface StubObserver {
  readonly callback: (entries: unknown[], observer: unknown) => void;
  /** The options the constructor was given. */
  readonly options: unknown;
  /** What is being observed, in the order observe() was called. */
  observed: Element[];
  disconnected: boolean;
  observe(target: Element): void;
  unobserve(target: Element): void;
  disconnect(): void;
  takeRecords(): unknown[];
  /** Calls the observer's callback with `entries` (default none), as a layout change would. */
  fire(entries?: unknown[]): void;
}

export interface ObserverStub {
  /** Every observer built since the install, oldest first. */
  instances: StubObserver[];
  restore: Restore;
}

/**
 * Replaces `ResizeObserver`, `IntersectionObserver` or `MutationObserver` with a stub that records
 * what each instance observes and fires only when the test says so.
 */
export function installObserverStub(
  name: "ResizeObserver" | "IntersectionObserver" | "MutationObserver",
): ObserverStub {
  const instances: StubObserver[] = [];
  class Stub implements StubObserver {
    observed: Element[] = [];
    disconnected = false;
    constructor(
      readonly callback: (entries: unknown[], observer: unknown) => void,
      readonly options: unknown = undefined,
    ) {
      instances.push(this);
    }
    observe(target: Element): void {
      this.observed.push(target);
    }
    unobserve(target: Element): void {
      this.observed = this.observed.filter((el) => el !== target);
    }
    disconnect(): void {
      this.disconnected = true;
    }
    takeRecords(): unknown[] {
      return [];
    }
    fire(entries: unknown[] = []): void {
      this.callback(entries, this);
    }
  }
  return { instances, restore: replaceProperty(globalThis, name, Stub) };
}

export interface ClipboardStub {
  /** Every string written, in order. */
  writes: string[];
  restore: Restore;
}

/**
 * Gives `navigator` a clipboard whose writeText records the text and then defers to `writeText`
 * (default: resolves). Pass a rejecting one, or a vi.fn to assert on, as the test needs.
 */
export function stubClipboard(writeText: (text: string) => Promise<void> = () => Promise.resolve()): ClipboardStub {
  const writes: string[] = [];
  const clipboard = {
    writeText(text: string): Promise<void> {
      writes.push(text);
      return writeText(text);
    },
    readText(): Promise<string> {
      return Promise.resolve(writes.at(-1) ?? "");
    },
  };
  return { writes, restore: replaceProperty(navigator, "clipboard", clipboard) };
}

export interface ExecCommandStub {
  /** Every command run, in order. */
  calls: string[];
  restore: Restore;
}

/** jsdom has no `document.execCommand`, which the clipboard fallback calls; this adds one. */
export function installExecCommand(
  run: (command: string) => boolean = () => true,
  doc: Document = document,
): ExecCommandStub {
  const calls: string[] = [];
  const execCommand = (command: string): boolean => {
    calls.push(command);
    return run(command);
  };
  return { calls, restore: replaceProperty(doc, "execCommand", execCommand) };
}

/** One call a stubbed canvas context recorded: a method call, or a property set as "set:name". */
export interface CanvasCall {
  name: string;
  args: unknown[];
}

export interface CanvasStub {
  /** Every call on every context handed out, in order. */
  calls: CanvasCall[];
  /** The contexts handed out, oldest first. */
  contexts: CanvasRenderingContext2D[];
  restore: Restore;
}

const CONTEXT_DEFAULTS: Record<string, unknown> = {
  fillStyle: "#000000",
  strokeStyle: "#000000",
  lineWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  font: "10px sans-serif",
  textAlign: "start",
  textBaseline: "alphabetic",
  direction: "inherit",
  globalAlpha: 1,
  globalCompositeOperation: "source-over",
  filter: "none",
  imageSmoothingEnabled: true,
  shadowBlur: 0,
  shadowColor: "rgba(0, 0, 0, 0)",
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

function imageData(width = 1, height = 1): ImageData {
  return { width, height, data: new Uint8ClampedArray(width * height * 4), colorSpace: "srgb" };
}

/** A 2D context that draws nothing and records everything, answering reads with plausible values. */
function recordingContext(canvas: HTMLCanvasElement, calls: CanvasCall[]): CanvasRenderingContext2D {
  const state: Record<string, unknown> = { ...CONTEXT_DEFAULTS };
  const answers: Partial<Record<string, (...args: unknown[]) => unknown>> = {
    measureText: (text) => ({
      width: String(text).length * 6,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
    }),
    getImageData: (_x, _y, w, h) => imageData(Number(w), Number(h)),
    createImageData: (w, h) => imageData(Number(w), Number(h)),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createConicGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({ setTransform() {} }),
    isPointInPath: () => false,
    isPointInStroke: () => false,
    getLineDash: () => [],
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  };
  return new Proxy({} as CanvasRenderingContext2D, {
    get(_target, prop) {
      if (prop === "canvas") return canvas;
      if (typeof prop !== "string") return undefined;
      if (prop in state) return state[prop];
      return (...args: unknown[]) => {
        calls.push({ name: prop, args });
        return answers[prop]?.(...args);
      };
    },
    set(_target, prop, value) {
      if (typeof prop === "string") {
        state[prop] = value;
        calls.push({ name: `set:${prop}`, args: [value] });
      }
      return true;
    },
  });
}

/**
 * jsdom's canvas has no drawing context without the native `canvas` package. This hands every
 * `getContext("2d")` a context that draws nothing but records each call, and answers any other
 * context type with null, as a browser without it would.
 */
export function installCanvasStub(): CanvasStub {
  const calls: CanvasCall[] = [];
  const contexts: CanvasRenderingContext2D[] = [];
  const perCanvas = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  function getContext(this: HTMLCanvasElement, type: string): CanvasRenderingContext2D | null {
    if (type !== "2d") return null;
    let ctx = perCanvas.get(this);
    if (!ctx) {
      ctx = recordingContext(this, calls);
      perCanvas.set(this, ctx);
      contexts.push(ctx);
    }
    return ctx;
  }
  return { calls, contexts, restore: replaceProperty(HTMLCanvasElement.prototype, "getContext", getContext) };
}
