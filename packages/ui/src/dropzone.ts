// The drag-and-drop wiring every app's dropzone repeats: the `dragover` class while something is
// held over it, a click that opens the hidden file input, and the window-level guard that keeps a
// drop missing the zone from navigating the page away. What a drop *means* (a video, a folder walk,
// a pose file) stays with the app, in `onDrop`.

export interface DropzoneHandlers {
  /** Called with the drop's DataTransfer. Items are only readable synchronously during the event,
   * so snapshot what you need before any await. */
  onDrop: (dataTransfer: DataTransfer, event: DragEvent) => void;
  /** The hidden <input type="file"> a click on the zone opens. */
  input?: HTMLInputElement;
  /** Called with the input's files after a pick that chose any, before the input is cleared so
   * picking the same file again still fires. Read what you need from the list synchronously. */
  onPick?: (files: FileList) => void;
  /** A browse button inside the zone whose own click must not also count as a zone click. */
  browseButton?: HTMLElement;
  /** Whether to install the window-level guard (default true; install it once per page). */
  guardWindow?: boolean;
}

export interface DropzoneBinding {
  /** Removes every listener this binding added. */
  dispose(): void;
}

export function bindDropzone(zone: HTMLElement, handlers: DropzoneHandlers): DropzoneBinding {
  const { onDrop, input, onPick, browseButton, guardWindow = true } = handlers;
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window,
    type: K | string,
    listener: (e: Event) => void,
  ): void => {
    target.addEventListener(type, listener);
    cleanups.push(() => target.removeEventListener(type, listener));
  };

  for (const type of ["dragenter", "dragover"]) {
    on(zone, type, (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
  }
  for (const type of ["dragleave", "drop"]) {
    on(zone, type, (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
    });
  }
  on(zone, "drop", (e) => {
    const event = e as DragEvent;
    if (event.dataTransfer) onDrop(event.dataTransfer, event);
  });

  if (input) {
    on(zone, "click", () => input.click());
    // stopPropagation keeps the browse button's own click (and the synthetic click bubbling back
    // out of the hidden input) from opening a second picker on top.
    on(input, "click", (e) => e.stopPropagation());
    if (onPick) {
      on(input, "change", () => {
        if (input.files?.length) onPick(input.files);
        input.value = "";
      });
    }
    if (browseButton) {
      on(browseButton, "click", (e) => {
        e.stopPropagation();
        input.click();
      });
    }
  }

  if (guardWindow) {
    on(window, "dragover", (e) => e.preventDefault());
    on(window, "drop", (e) => e.preventDefault());
  }

  return {
    dispose() {
      for (const cleanup of cleanups.splice(0)) cleanup();
    },
  };
}

/**
 * Shows `message` in the dropzone's reject line, each blank line ("\n\n") becoming a <br><br> gap.
 * The breaks are real elements and the prose text nodes, so nothing in `message` is parsed as markup.
 */
export function showDropzoneReject(el: HTMLElement, message: string): void {
  el.textContent = "";
  message.split("\n\n").forEach((paragraph, i) => {
    if (i) el.append(document.createElement("br"), document.createElement("br"));
    el.append(paragraph);
  });
  el.hidden = false;
}
