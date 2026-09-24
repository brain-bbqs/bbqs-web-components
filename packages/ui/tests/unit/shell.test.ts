import { afterEach, describe, expect, it } from "vitest";
import {
  buildAccountMenu,
  buildBrandWatermark,
  buildDropzone,
  buildHumanSubjectsBanner,
  buildPageFooter,
  buildThemeToggle,
} from "../../src/shell.js";
import { fragment } from "./fragments.js";

afterEach(() => {
  document.body.innerHTML = "";
});

/**
 * Compares built DOM to a reference fragment element by element: tag, every attribute (sorted, so
 * the order createElement sets them in does not matter), the hidden flag, and the element's own
 * text with whitespace collapsed the way prettier wraps the fragments.
 */
function skeleton(root: Element): string[] {
  return Array.from(root.querySelectorAll("*")).map((el) => {
    const attrs = Array.from(el.attributes)
      .map((a) => `${a.name}="${a.value}"`)
      .sort()
      .join(" ");
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent?.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ");
    return `${el.tagName.toLowerCase()}[${attrs}]:${text}`;
  });
}

function fragmentRoot(name: string): HTMLElement {
  const holder = document.createElement("div");
  holder.innerHTML = fragment(name);
  return holder;
}

describe("buildThemeToggle", () => {
  it("matches the reference fragment", () => {
    const holder = document.createElement("div");
    holder.append(buildThemeToggle());
    expect(skeleton(holder)).toEqual(skeleton(fragmentRoot("theme-toggle")));
  });

  it("takes the app's id", () => {
    expect(buildThemeToggle("theme-toggle").id).toBe("theme-toggle");
  });
});

describe("buildAccountMenu", () => {
  it("matches the reference fragment", () => {
    const { signIn, signedIn } = buildAccountMenu();
    const holder = document.createElement("div");
    holder.append(signIn, signedIn);
    expect(skeleton(holder)).toEqual(skeleton(fragmentRoot("account-menu")));
  });

  it("takes the app's ids and sign-in label", () => {
    const { signIn, signedIn } = buildAccountMenu({
      ids: { oauthSigninBtn: "oauth-signin-btn", oauthUsername: "oauth-username" },
      signInLabel: "Sign in",
    });
    expect(signIn.id).toBe("oauth-signin-btn");
    expect(signIn.textContent).toBe("Sign in");
    expect(signedIn.querySelector("#oauth-username")).not.toBe(null);
    expect(signedIn.querySelector("#oauthUsername")).toBe(null);
    // Ids not overridden keep their defaults.
    expect(signedIn.id).toBe("oauthSignedIn");
    expect(signedIn.querySelector("#oauthAvatar")).not.toBe(null);
  });
});

describe("buildBrandWatermark", () => {
  it("matches the reference fragment", () => {
    const holder = document.createElement("div");
    holder.append(buildBrandWatermark({ logoSrc: "/src/assets/bbqs-logo.png" }));
    expect(skeleton(holder)).toEqual(skeleton(fragmentRoot("brand-watermark")));
  });

  it("takes another destination and label", () => {
    const link = buildBrandWatermark({ logoSrc: "/x.png", href: "https://example.org", label: "Example" });
    expect(link.href).toBe("https://example.org/");
    expect(link.title).toBe("Example");
    expect(link.querySelector("img")?.alt).toBe("Example");
  });
});

describe("buildPageFooter", () => {
  it("matches the reference fragment's structure", () => {
    const footer = buildPageFooter({
      repoUrl: "https://github.com/brain-bbqs/APP",
      brands: [
        {
          href: "https://talmolab.org/",
          label: "Talmo Lab",
          logoSrc: { onLight: "/src/assets/talmolab-logo.svg", onDark: "/src/assets/talmolab-logo-on-dark.svg" },
          caption: "Talmo Lab",
        },
        {
          href: "https://centerforopenneuroscience.org",
          label: "Center for Open Neuroscience",
          logoSrc: "/src/assets/con-logo.png",
        },
      ],
    });
    const holder = document.createElement("div");
    holder.append(footer);
    expect(skeleton(holder)).toEqual(skeleton(fragmentRoot("page-footer")));
    const links = footer.querySelectorAll<HTMLAnchorElement>(".footer-text-link");
    expect(links[0].href).toBe("https://github.com/brain-bbqs/APP/issues/new?template=bug_report.yml");
    expect(links[1].href).toBe("https://github.com/brain-bbqs/APP/issues/new?template=feature_request.yml");
    expect(footer.querySelector<HTMLAnchorElement>("#version-indicator")?.href).toBe(
      "https://github.com/brain-bbqs/APP",
    );
  });

  it("puts leading rows first and extras after the version stamp, each behind a dot", () => {
    const whatsNew = document.createElement("button");
    whatsNew.textContent = "What's New";
    const clear = document.createElement("button");
    clear.textContent = "Clear cache";
    const footer = buildPageFooter({
      repoUrl: "https://r",
      versionIndicatorId: "ver",
      leadingRows: [whatsNew],
      versionRowExtras: [clear],
    });
    const rows = footer.querySelectorAll(".footer-row");
    expect(rows).toHaveLength(4);
    expect(rows[0].firstElementChild).toBe(whatsNew);
    const versionRow = rows[3];
    expect(versionRow.children[0].id).toBe("ver");
    expect(versionRow.children[1].className).toBe("footer-dot");
    expect(versionRow.children[2]).toBe(clear);
    expect(footer.querySelector(".footer-brands")).toBe(null);
  });

  it("captions a single-logo mark too, leaving the image alt to the caption", () => {
    const footer = buildPageFooter({
      repoUrl: "https://r",
      brands: [{ href: "https://lab.test", label: "Lab", logoSrc: "/lab.png", caption: "Lab" }],
    });
    const link = footer.querySelector<HTMLAnchorElement>(".footer-brand-link")!;
    expect(link.className).toBe("footer-brand-link captioned");
    expect(link.querySelector("img")?.alt).toBe("");
    expect(link.querySelector(".footer-brand-name")?.textContent).toBe("Lab");
  });
});

describe("buildHumanSubjectsBanner", () => {
  it("matches the reference fragment", () => {
    const holder = document.createElement("div");
    holder.append(buildHumanSubjectsBanner());
    expect(skeleton(holder)).toEqual(skeleton(fragmentRoot("human-subjects-banner")));
  });

  it("takes an intro paragraph and the app's ids", () => {
    const banner = buildHumanSubjectsBanner({ intro: "Blur first.", ids: { banner: "human-subjects-banner" } });
    expect(banner.id).toBe("human-subjects-banner");
    expect(banner.querySelectorAll(".human-subjects-body")[0].textContent).toBe("Blur first.");
  });
});

describe("buildDropzone", () => {
  it("matches the reference fragment", () => {
    const dz = buildDropzone({
      prompt: "Drop your dataset folder here, or ",
      browseLabel: "browse for a folder",
      browseButtonId: "browseFolderBtn",
      hint: "Everything inside the folder is scanned first; you choose what to include next.",
    });
    const holder = document.createElement("div");
    holder.append(dz);
    expect(skeleton(holder)).toEqual(skeleton(fragmentRoot("dropzone")));
  });

  it("leaves the browse button without an id when none is given", () => {
    const dz = buildDropzone({ prompt: "Drop here, or ", browseLabel: "browse" });
    const browse = dz.querySelector<HTMLButtonElement>(".dz-browse")!;
    expect(browse.textContent).toBe("browse");
    expect(browse.id).toBe("");
  });

  it("can be compact, carry a logo instead of an emoji, and have no browse button", () => {
    const logo = document.createElement("img");
    const dz = buildDropzone({ id: "slpDropzone", prompt: "Drop a pose file here.", icon: logo, compact: true });
    expect(dz.id).toBe("slpDropzone");
    expect(dz.className).toBe("dropzone compact");
    expect(dz.querySelector(".dz-icon")?.firstElementChild).toBe(logo);
    expect(dz.querySelector(".dz-browse")).toBe(null);
    expect(dz.querySelector(".dz-hint")).toBe(null);
  });
});
