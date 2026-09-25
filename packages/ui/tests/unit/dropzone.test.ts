import { afterEach, describe, expect, it, vi } from "vitest";
import { bindDropzone, showDropzoneReject } from "../../src/dropzone.js";

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

describe("bindDropzone onPick", () => {
  function pick(input: HTMLInputElement, names: string[]): void {
    const files = names.map((n) => new File(["x"], n));
    Object.defineProperty(input, "files", {
      value: Object.assign(files, { item: (i: number) => files[i] }),
      configurable: true,
    });
    input.dispatchEvent(new Event("change"));
  }

  it("hands a pick's files to the app, then clears the input so the same pick fires again", () => {
    const { zone, input, onDrop } = setup();
    const onPick = vi.fn((files: FileList) => files[0].name);
    const value = vi.spyOn(input, "value", "set");
    bindDropzone(zone, { onDrop, input, onPick, guardWindow: false });
    pick(input, ["clip.mp4"]);
    expect(onPick).toHaveReturnedWith("clip.mp4");
    expect(value).toHaveBeenCalledWith("");
  });

  it("skips an empty pick but still clears the input", () => {
    const { zone, input, onDrop } = setup();
    const onPick = vi.fn();
    const value = vi.spyOn(input, "value", "set");
    bindDropzone(zone, { onDrop, input, onPick, guardWindow: false });
    pick(input, []);
    expect(onPick).not.toHaveBeenCalled();
    expect(value).toHaveBeenCalledWith("");
  });

  it("leaves the input's change event alone without onPick, and unbinds it on dispose", () => {
    const { zone, input, onDrop } = setup();
    const value = vi.spyOn(input, "value", "set");
    bindDropzone(zone, { onDrop, input, guardWindow: false });
    pick(input, ["a.mp4"]);
    expect(value).not.toHaveBeenCalled();
    const onPick = vi.fn();
    bindDropzone(zone, { onDrop, input, onPick, guardWindow: false }).dispose();
    pick(input, ["a.mp4"]);
    expect(onPick).not.toHaveBeenCalled();
  });
});

describe("showDropzoneReject", () => {
  it("shows the message with each blank line as a <br><br> gap, parsing none of it as markup", () => {
    const el = document.createElement("p");
    el.hidden = true;
    el.textContent = "an older message";
    showDropzoneReject(el, "That wasn't a file.\n\nDrop a <b>single</b> file instead.");
    expect(el.hidden).toBe(false);
    expect(el.querySelectorAll("br")).toHaveLength(2);
    expect(el.querySelector("b")).toBe(null);
    expect(el.textContent).toBe("That wasn't a file.Drop a <b>single</b> file instead.");
  });

  it("shows a one-paragraph message without breaks", () => {
    const el = document.createElement("p");
    showDropzoneReject(el, "That folder contains no uploadable files.");
    expect(el.childNodes).toHaveLength(1);
  });
});
