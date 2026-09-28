// bbqs-uploader's and the web-app template's src/lib/changelog.ts as they were before
// @brain-bbqs/ui took the modal over, kept verbatim as the reference changelog.parity.test.ts
// checks the DOM renderer against. It builds an HTML string for innerHTML, which is exactly what
// the package's renderer no longer does; it lives here only as a test oracle.

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return html;
}

function renderVersionBody(body: string): string {
  let html = "";
  let inList = false;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#### ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h4>${renderInline(line.slice(5))}</h4>`;
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${renderInline(line.slice(2))}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${renderInline(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

export function legacyRenderChangelogHtml(markdown: string, versionCount = 3): string {
  const versions = markdown.split(/^## /m).slice(1, versionCount + 1);
  return versions
    .map((block) => {
      const newline = block.indexOf("\n");
      const version = (newline === -1 ? block : block.slice(0, newline)).trim();
      const body = newline === -1 ? "" : block.slice(newline + 1);
      return `<section class="changelog-version"><h3>${escapeHtml(version)}</h3>${renderVersionBody(body)}</section>`;
    })
    .join("");
}
