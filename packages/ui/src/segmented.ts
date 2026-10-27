// The segmented control's selection, as clip-extractor's wireSeg/selectSeg kept it: each button's
// value is its first data-* attribute (data-src="local", data-mode="video"), and selecting one marks
// it active and pressed while clearing the rest. What a choice *means* stays with the app.

export interface SegmentedBinding {
  /** Removes every listener this binding added. */
  dispose(): void;
}

function segments(group: HTMLElement): HTMLButtonElement[] {
  return Array.from(group.querySelectorAll<HTMLButtonElement>("button"));
}

/** A segment's value: its first data-* attribute. */
export function segmentValue(segment: HTMLElement): string | undefined {
  return Object.values(segment.dataset)[0];
}

/** Marks the segment whose value is `value` active and pressed, and every other one not. */
export function selectSegment(group: HTMLElement, value: string | undefined): void {
  for (const segment of segments(group)) {
    const active = value !== undefined && segmentValue(segment) === value;
    segment.classList.toggle("active", active);
    segment.setAttribute("aria-pressed", String(active));
  }
}

/** The active segment's value, or undefined when none is active. */
export function selectedSegment(group: HTMLElement): string | undefined {
  const active = segments(group).find((segment) => segment.classList.contains("active"));
  return active ? segmentValue(active) : undefined;
}

/** Selects a segment when it is clicked, then hands its value to `onSelect`. A disabled segment
 * fires no click, so it is never selected. */
export function bindSegmented(group: HTMLElement, onSelect: (value: string) => void): SegmentedBinding {
  const cleanups = segments(group).map((segment) => {
    const listener = (): void => {
      const value = segmentValue(segment);
      if (value === undefined) return;
      selectSegment(group, value);
      onSelect(value);
    };
    segment.addEventListener("click", listener);
    return () => segment.removeEventListener("click", listener);
  });
  return {
    dispose() {
      for (const cleanup of cleanups.splice(0)) cleanup();
    },
  };
}
