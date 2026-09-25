import { afterEach, describe, expect, it, vi } from "vitest";
import { createHumanSubjectsGate } from "../../src/humanSubjectsGate.js";
import { buildHumanSubjectsBanner } from "../../src/shell.js";

function gateFromBanner(onChange = vi.fn()) {
  const banner = buildHumanSubjectsBanner();
  document.body.append(banner);
  const els = {
    banner,
    unconfirmed: banner.querySelector<HTMLElement>("#humanSubjectsUnconfirmed")!,
    confirmBtn: banner.querySelector<HTMLElement>("#humanSubjectsConfirmBtn")!,
    confirmed: banner.querySelector<HTMLElement>("#humanSubjectsConfirmed")!,
  };
  return { gate: createHumanSubjectsGate(els, onChange), els, onChange };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createHumanSubjectsGate", () => {
  it("stays hidden for a dataset that is not flagged", () => {
    const { gate, els } = gateFromBanner();
    expect(gate.render("000123", false)).toBe("hidden");
    expect(els.banner.hidden).toBe(true);
    expect(gate.isBlocking("000123")).toBe(false);
  });

  it("asks for confirmation for a flagged dataset, and blocks until it gets it", () => {
    const { gate, els, onChange } = gateFromBanner();
    expect(gate.render("000123", true)).toBe("unconfirmed");
    expect(els.banner.hidden).toBe(false);
    expect(els.unconfirmed.hidden).toBe(false);
    expect(els.confirmed.hidden).toBe(true);
    expect(gate.isBlocking("000123")).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith("unconfirmed");

    els.confirmBtn.click();
    expect(gate.state).toBe("confirmed");
    expect(els.unconfirmed.hidden).toBe(true);
    expect(els.confirmed.hidden).toBe(false);
    expect(gate.isBlocking("000123")).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith("confirmed");
  });

  it("remembers a confirmation per dataset for the page's lifetime", () => {
    const { gate } = gateFromBanner();
    gate.render("000123", true);
    gate.confirm("000123");
    expect(gate.render("000456", true)).toBe("unconfirmed");
    expect(gate.render("000123", true)).toBe("confirmed");
    expect(gate.isBlocking("000456")).toBe(true);
  });

  it("forgets a flag when a dataset is re-rendered as unflagged", () => {
    const { gate } = gateFromBanner();
    gate.render("000123", true);
    gate.render("000123", false);
    expect(gate.isBlocking("000123")).toBe(false);
  });

  it("does not redraw for a confirmation of a dataset other than the one on screen", () => {
    const { gate, onChange } = gateFromBanner();
    gate.render("000123", true);
    onChange.mockClear();
    gate.confirm("000999");
    expect(onChange).not.toHaveBeenCalled();
    expect(gate.state).toBe("unconfirmed");
  });

  it("keeps the inner blocks following the confirmation while the banner is hidden, as the apps did", () => {
    const { gate, els } = gateFromBanner();
    gate.render("000123", true);
    gate.confirm("000123");
    expect(gate.render("000123", false)).toBe("hidden");
    expect(els.banner.hidden).toBe(true);
    expect(els.unconfirmed.hidden).toBe(true);
    expect(els.confirmed.hidden).toBe(false);
    expect(gate.render("000456", false)).toBe("hidden");
    expect(els.unconfirmed.hidden).toBe(false);
    expect(els.confirmed.hidden).toBe(true);
  });

  it("confirms nothing when clicked with no dataset picked, and only redraws", () => {
    const { gate, els, onChange } = gateFromBanner();
    gate.render("", false);
    onChange.mockClear();
    els.confirmBtn.click();
    expect(onChange).toHaveBeenCalledWith("hidden");
    expect(gate.isBlocking("")).toBe(false);
    expect(gate.render("", true)).toBe("unconfirmed");
  });

  it("works without an onChange listener", () => {
    const banner = buildHumanSubjectsBanner({
      ids: { banner: "b", unconfirmed: "u", confirmBtn: "c", confirmed: "d" },
    });
    document.body.append(banner);
    const gate = createHumanSubjectsGate({
      banner,
      unconfirmed: banner.querySelector("#u")!,
      confirmBtn: banner.querySelector("#c")!,
      confirmed: banner.querySelector("#d")!,
    });
    expect(gate.render("1", true)).toBe("unconfirmed");
  });
});
