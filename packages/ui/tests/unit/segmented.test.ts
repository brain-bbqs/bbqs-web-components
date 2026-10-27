import { afterEach, describe, expect, it, vi } from "vitest";
import { bindSegmented, segmentValue, selectedSegment, selectSegment } from "../../src/segmented.js";
import { fragment, mount } from "./fragments.js";

function setup() {
  mount(fragment("segmented"));
  const group = document.getElementById("srcSeg")!;
  const [local, browse, url] = Array.from(group.querySelectorAll("button"));
  return { group, local, browse, url };
}

/** Each segment's aria-pressed, once its active class is checked to agree. */
function pressed(group: HTMLElement): string[] {
  return Array.from(group.querySelectorAll("button"), (b) => {
    const value = b.getAttribute("aria-pressed") ?? "";
    expect(b.classList.contains("active")).toBe(value === "true");
    return value;
  });
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("segmentValue", () => {
  it("reads a segment's first data attribute, whatever it is called", () => {
    const { browse } = setup();
    expect(segmentValue(browse)).toBe("browse");
    expect(segmentValue(document.createElement("button"))).toBeUndefined();
  });
});

describe("selectSegment", () => {
  it("marks the chosen segment active and pressed, and clears the rest", () => {
    const { group, url } = setup();
    selectSegment(group, "ember");
    expect(pressed(group)).toEqual(["false", "false", "true"]);
    expect(url.classList.contains("active")).toBe(true);
    expect(selectedSegment(group)).toBe("ember");
  });

  it.each([
    ["undefined", undefined],
    ["a value no segment holds", "nowhere"],
  ])("leaves none active for %s", (_, value) => {
    const { group } = setup();
    selectSegment(group, value);
    expect(pressed(group)).toEqual(["false", "false", "false"]);
    expect(selectedSegment(group)).toBeUndefined();
  });
});

describe("bindSegmented", () => {
  it("selects a clicked segment, then hands its value to the app", () => {
    const { group, browse } = setup();
    const onSelect = vi.fn(() => {
      expect(selectedSegment(group)).toBe("browse");
    });
    bindSegmented(group, onSelect);
    browse.click();
    expect(onSelect).toHaveBeenCalledWith("browse");
    expect(pressed(group)).toEqual(["false", "true", "false"]);
  });

  it("never selects a disabled segment", () => {
    const { group, browse } = setup();
    browse.disabled = true;
    const onSelect = vi.fn();
    bindSegmented(group, onSelect);
    browse.click();
    expect(onSelect).not.toHaveBeenCalled();
    expect(selectedSegment(group)).toBe("local");
  });

  it("ignores a segment with no value", () => {
    const { group } = setup();
    const bare = document.createElement("button");
    group.append(bare);
    const onSelect = vi.fn();
    bindSegmented(group, onSelect);
    bare.click();
    expect(onSelect).not.toHaveBeenCalled();
    expect(selectedSegment(group)).toBe("local");
  });

  it("stops listening once disposed", () => {
    const { group, url } = setup();
    const onSelect = vi.fn();
    const binding = bindSegmented(group, onSelect);
    binding.dispose();
    binding.dispose();
    url.click();
    expect(onSelect).not.toHaveBeenCalled();
    expect(selectedSegment(group)).toBe("local");
  });
});
