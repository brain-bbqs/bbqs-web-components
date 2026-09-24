import { afterEach, describe, expect, it, vi } from "vitest";
import { bindDropzone } from "../../src/dropzone.js";

function dragEvent(type: string, dataTransfer?: unknown): Event {
  const e = new Event(type, { bubbles: true, cancelable: true });
  if (dataTransfer !== undefined) Object.defineProperty(e, "dataTransfer", { value: dataTransfer });
  return e;
}

function setup() {
  const zone = document.createElement("div");
  const input = document.createElement("input");
  input.type = "file";
  const browse = document.createElement("button");
  zone.append(browse, input);
  document.body.append(zone);
  const onDrop = vi.fn();
  const inputClick = vi.spyOn(input, "click").mockImplementation(() => {});
  return { zone, input, browse, onDrop, inputClick };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("bindDropzone", () => {
  it("marks the zone while something is dragged over it, and clears it on leave or drop", () => {
    const { zone, onDrop } = setup();
    bindDropzone(zone, { onDrop, guardWindow: false });
    zone.dispatchEvent(dragEvent("dragenter"));
    expect(zone.classList.contains("dragover")).toBe(true);
    zone.dispatchEvent(dragEvent("dragleave"));
    expect(zone.classList.contains("dragover")).toBe(false);
    zone.dispatchEvent(dragEvent("dragover"));
    zone.dispatchEvent(dragEvent("drop", { items: [], files: [] }));
    expect(zone.classList.contains("dragover")).toBe(false);
  });

  it("hands the drop's DataTransfer to the app, and prevents the browser's default", () => {
    const { zone, onDrop } = setup();
    bindDropzone(zone, { onDrop, guardWindow: false });
    const transfer = { items: [], files: [] };
    const e = dragEvent("drop", transfer);
    zone.dispatchEvent(e);
    expect(onDrop).toHaveBeenCalledWith(transfer, e);
    expect(e.defaultPrevented).toBe(true);
  });

  it("ignores a drop carrying no DataTransfer", () => {
    const { zone, onDrop } = setup();
    bindDropzone(zone, { onDrop, guardWindow: false });
    zone.dispatchEvent(dragEvent("drop", null));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("opens the file input from a click on the zone or its browse button, once", () => {
    const { zone, input, browse, onDrop, inputClick } = setup();
    bindDropzone(zone, { onDrop, input, browseButton: browse, guardWindow: false });
    zone.click();
    expect(inputClick).toHaveBeenCalledTimes(1);
    browse.click();
    // The button's click stops at the button; the zone's own handler must not fire a second time.
    expect(inputClick).toHaveBeenCalledTimes(2);
    input.dispatchEvent(new Event("click", { bubbles: true }));
    expect(inputClick).toHaveBeenCalledTimes(2);
  });

  it("keeps a drop that misses the zone from navigating the page away", () => {
    const { zone, onDrop } = setup();
    const binding = bindDropzone(zone, { onDrop });
    const stray = dragEvent("drop", { items: [], files: [] });
    window.dispatchEvent(stray);
    expect(stray.defaultPrevented).toBe(true);
    const over = dragEvent("dragover");
    window.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    binding.dispose();
    const after = dragEvent("drop", { items: [], files: [] });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it("removes every listener on dispose", () => {
    const { zone, input, onDrop, inputClick } = setup();
    bindDropzone(zone, { onDrop, input, guardWindow: false }).dispose();
    zone.dispatchEvent(dragEvent("dragenter"));
    expect(zone.classList.contains("dragover")).toBe(false);
    zone.click();
    expect(inputClick).not.toHaveBeenCalled();
  });
});
