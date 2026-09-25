import { withCard, withTheme } from "./utils.js";

function button(label: string, className = "", disabled = false): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = label;
  b.disabled = disabled;
  return b;
}

function row(...children: HTMLElement[]): HTMLDivElement {
  const div = document.createElement("div");
  div.style.display = "flex";
  div.style.flexWrap = "wrap";
  div.style.alignItems = "center";
  div.style.gap = "0.75rem";
  div.style.marginBottom = "1rem";
  div.append(...children);
  return div;
}

function badge(kind: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `badge ${kind}`;
  span.textContent = kind;
  return span;
}

function progress(fraction: number, done: boolean): HTMLDivElement {
  const bar = document.createElement("div");
  bar.className = "progress";
  const fill = document.createElement("div");
  fill.className = done ? "progress-fill ok" : "progress-fill";
  fill.style.width = `${fraction * 100}%`;
  bar.append(fill);
  return bar;
}

/** Buttons in each state, the badge kinds, a status line and the progress bar, in a card. With
 * `accentDisabled`, the knob clip-extractor sets so a disabled primary keeps its accent. */
function buildControls(accentDisabled = false): HTMLElement {
  const card = document.createElement("section");
  card.className = "card";
  if (accentDisabled) card.style.setProperty("--button-primary-disabled", "var(--accent)");
  const heading = document.createElement("h2");
  heading.textContent = "Controls";
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "A quiet line describing a control.";
  card.append(
    heading,
    row(
      button("Upload", "primary"),
      button("Upload", "primary", true),
      button("Cancel"),
      button("Cancel", "", true),
      button("Change video", "ghost small"),
    ),
    row(...["ok", "warn", "err", "scan", "upload", "restricted"].map(badge)),
    hint,
    progress(0.4, false),
    document.createElement("br"),
    progress(1, true),
  );
  return withCard(card);
}

export default {
  title: "Components/Controls",
};

export const Light = { name: "Controls (light)", render: () => withTheme("light", () => buildControls()) };
export const Dark = { name: "Controls (dark)", render: () => withTheme("dark", () => buildControls()) };
export const AccentDisabled = {
  name: "Disabled primary keeps the accent (clip-extractor)",
  render: () => withTheme("light", () => buildControls(true)),
};
