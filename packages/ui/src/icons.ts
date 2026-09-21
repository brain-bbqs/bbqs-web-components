import { svgEl } from "./dom.js";

// The stroked, currentColor icons the shell draws inline rather than as emoji: Windows renders
// emoji with colour presentation, while a stroked path stays monochrome and follows the theme.

function strokeIcon(size: number, strokeWidth = 2): SVGSVGElement {
  return svgEl("svg", {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": strokeWidth,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  });
}

/** The theme toggle's "switch to dark" glyph. */
export function moonIcon(size = 20): SVGSVGElement {
  const svg = strokeIcon(size);
  svg.classList.add("theme-toggle-moon");
  svg.append(svgEl("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }));
  return svg;
}

/** The theme toggle's "switch to light" glyph. */
export function sunIcon(size = 20): SVGSVGElement {
  const svg = strokeIcon(size);
  svg.classList.add("theme-toggle-sun");
  svg.append(svgEl("circle", { cx: 12, cy: 12, r: 5 }));
  const rays: [number, number, number, number][] = [
    [12, 1, 12, 3],
    [12, 21, 12, 23],
    [4.22, 4.22, 5.64, 5.64],
    [18.36, 18.36, 19.78, 19.78],
    [1, 12, 3, 12],
    [21, 12, 23, 12],
    [4.22, 19.78, 5.64, 18.36],
    [18.36, 5.64, 19.78, 4.22],
  ];
  for (const [x1, y1, x2, y2] of rays) svg.append(svgEl("line", { x1, y1, x2, y2 }));
  return svg;
}

/** The account menu's sign-out arrow. */
export function signOutIcon(size = 14): SVGSVGElement {
  const svg = strokeIcon(size);
  svg.classList.add("oauth-popover-signout-icon");
  svg.append(
    svgEl("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }),
    svgEl("polyline", { points: "16 17 21 12 16 7" }),
    svgEl("line", { x1: 21, y1: 12, x2: 9, y2: 12 }),
  );
  return svg;
}

/** The circular-arrow "start again" mark (bbqs-uploader's re-check, encoding-helper's reset). */
export function resetIcon(size = 14): SVGSVGElement {
  const svg = strokeIcon(size, 2.5);
  svg.append(svgEl("polyline", { points: "23 4 23 10 17 10" }));
  svg.append(svgEl("path", { d: "M20.49 15 A9 9 0 1 1 18.36 5.64 L23 10" }));
  return svg;
}

/** A downward chevron, for a collapsible section's toggle. */
export function chevronIcon(size = 18): SVGSVGElement {
  const svg = strokeIcon(size);
  svg.append(svgEl("polyline", { points: "6 9 12 15 18 9" }));
  return svg;
}
