import { buildSegmented, type SegmentOption } from "@brain-bbqs/ui";
import { withCard, withTheme } from "./utils.js";

// The EMBER flame, drawn inline so the story needs no asset.
function flame(): HTMLImageElement {
  const img = document.createElement("img");
  img.alt = "";
  img.width = 12;
  img.height = 15;
  img.src =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 15"><path d="M6 0C7 4 12 6 12 10a6 5 0 0 1-12 0C0 7 3 5 6 0z" fill="#dc2626"/></svg>',
    );
  return img;
}

function sources(disabledBrowse = false): SegmentOption[] {
  return [
    { value: "local", label: "Load local file", icon: "📁" },
    { value: "browse", label: "Browse EMBER", icon: flame(), disabled: disabledBrowse },
    { value: "url", label: "Load from a URL", icon: "🔗" },
  ];
}

function build(): HTMLElement {
  const sourcePicker = buildSegmented({ label: "Source", options: sources(), stackable: true });
  const mode = buildSegmented({
    label: "Selector mode",
    options: [
      { value: "video", label: "Snippet" },
      { value: "frame", label: "Frame" },
    ],
    selected: "frame",
  });
  const speed = buildSegmented({
    label: "Playback speed",
    small: true,
    options: ["0.25×", "0.5×", "1×", "2×"].map((label) => ({ value: label, label })),
    selected: "1×",
  });
  const disabled = buildSegmented({ label: "Source, with one not yet available", options: sources(true) });
  const rows = [sourcePicker, mode, speed, disabled].map((seg) => {
    const row = document.createElement("div");
    row.style.marginBottom = "1rem";
    row.append(seg);
    return row;
  });
  return withCard(rows);
}

export default {
  title: "Components/Segmented control",
};

export const Light = { name: "Light", render: () => withTheme("light", build) };
export const Dark = { name: "Dark", render: () => withTheme("dark", build) };
