// The human-subjects gate both upload tools raise: for a dataset flagged as holding human-subjects
// data (see `containsHumanSubjects` in @brain-bbqs/ember-client), the loudest block on the page
// asks for two confirmations and holds the Upload button until it gets them, once per dataset per
// page load.

export interface HumanSubjectsElements {
  banner: HTMLElement;
  unconfirmed: HTMLElement;
  confirmBtn: HTMLElement;
  confirmed: HTMLElement;
}

export type HumanSubjectsState = "hidden" | "unconfirmed" | "confirmed";

export interface HumanSubjectsGate {
  /** Draws the banner for `dandisetId`: hidden when not flagged, else asking or thanking. */
  render(dandisetId: string, flagged: boolean): HumanSubjectsState;
  /** Whether uploads to `dandisetId` are still held back by an unanswered banner. */
  isBlocking(dandisetId: string): boolean;
  /** Records the confirmation, as the button's own click does. */
  confirm(dandisetId: string): void;
  readonly state: HumanSubjectsState;
}

export function createHumanSubjectsGate(
  els: HumanSubjectsElements,
  onChange: (state: HumanSubjectsState) => void = () => {},
): HumanSubjectsGate {
  const confirmedIds = new Set<string>();
  const flaggedIds = new Set<string>();
  let state: HumanSubjectsState = "hidden";
  let current = "";

  function draw(): void {
    const flagged = flaggedIds.has(current);
    state = !flagged ? "hidden" : confirmedIds.has(current) ? "confirmed" : "unconfirmed";
    els.banner.hidden = state === "hidden";
    els.unconfirmed.hidden = state !== "unconfirmed";
    els.confirmed.hidden = state !== "confirmed";
    onChange(state);
  }

  const gate: HumanSubjectsGate = {
    render(dandisetId, flagged) {
      current = dandisetId;
      if (flagged) flaggedIds.add(dandisetId);
      else flaggedIds.delete(dandisetId);
      draw();
      return state;
    },
    isBlocking(dandisetId) {
      return flaggedIds.has(dandisetId) && !confirmedIds.has(dandisetId);
    },
    confirm(dandisetId) {
      confirmedIds.add(dandisetId);
      if (dandisetId === current) draw();
    },
    get state() {
      return state;
    },
  };

  els.confirmBtn.addEventListener("click", () => gate.confirm(current));
  return gate;
}
