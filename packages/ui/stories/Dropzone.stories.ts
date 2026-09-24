import { buildDropzone } from "@brain-bbqs/ui";
import { withCard, withTheme } from "./utils.js";

type DropzoneState = "idle" | "dragover" | "rejected";

function build(state: DropzoneState): HTMLElement {
  const dz = buildDropzone({
    prompt: "Drop your dataset folder here, or ",
    browseLabel: "browse for a folder",
    hint: "Everything inside the folder is scanned first; you choose what to include next.",
  });
  if (state === "dragover") dz.classList.add("dragover");
  if (state === "rejected") {
    const reject = dz.querySelector<HTMLElement>(".dz-reject")!;
    reject.append(
      "Individual files can't be uploaded on their own.",
      document.createElement("br"),
      document.createElement("br"),
    );
    reject.append("Drop the folder that contains them instead.");
    reject.hidden = false;
  }
  return withCard(dz);
}

export default {
  title: "Components/Dropzone",
};

export const IdleLight = { name: "Idle (light)", render: () => withTheme("light", () => build("idle")) };
export const IdleDark = { name: "Idle (dark)", render: () => withTheme("dark", () => build("idle")) };
export const DragOverLight = { name: "Drag over (light)", render: () => withTheme("light", () => build("dragover")) };
export const DragOverDark = { name: "Drag over (dark)", render: () => withTheme("dark", () => build("dragover")) };
export const RejectedLight = {
  name: "Loose files rejected (light)",
  render: () => withTheme("light", () => build("rejected")),
};
export const RejectedDark = {
  name: "Loose files rejected (dark)",
  render: () => withTheme("dark", () => build("rejected")),
};
export const Compact = {
  name: "Compact, with a logo",
  render: () =>
    withTheme("light", () => {
      const logo = document.createElement("img");
      logo.className = "dz-logo";
      logo.alt = "SLEAP";
      logo.src =
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#15803d"/></svg>',
        );
      return withCard(
        buildDropzone({
          prompt: "Drop a SLEAP .slp or ndx-pose .nwb here, or click to browse ",
          browseLabel: "files",
          icon: logo,
          compact: true,
        }),
      );
    }),
};
