import { buildHumanSubjectsBanner, createHumanSubjectsGate } from "@brain-bbqs/ui";
import { withCard, withTheme } from "./utils.js";

function buildBanner(confirmed: boolean, intro?: string): HTMLElement {
  const banner = buildHumanSubjectsBanner({ intro });
  const gate = createHumanSubjectsGate({
    banner,
    unconfirmed: banner.querySelector("#humanSubjectsUnconfirmed")!,
    confirmBtn: banner.querySelector("#humanSubjectsConfirmBtn")!,
    confirmed: banner.querySelector("#humanSubjectsConfirmed")!,
  });
  gate.render("000123", true);
  if (confirmed) gate.confirm("000123");
  return withCard(banner);
}

export default {
  title: "Components/Human subjects banner",
};

export const UnconfirmedLight = {
  name: "Awaiting confirmation (light)",
  render: () => withTheme("light", () => buildBanner(false)),
};

export const UnconfirmedDark = {
  name: "Awaiting confirmation (dark)",
  render: () => withTheme("dark", () => buildBanner(false)),
};

export const Confirmed = {
  name: "Confirmed",
  render: () => withTheme("light", () => buildBanner(true)),
};

export const WithIntro = {
  name: "With an app-specific intro (clip-extractor)",
  render: () =>
    withTheme("light", () =>
      buildBanner(
        false,
        "The blur tool under the player can be used to cover a face or anything else identifying, in whatever you extract.",
      ),
    ),
};
