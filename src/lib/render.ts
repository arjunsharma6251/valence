/**
 * Mini-markdown → HTML, with KaTeX (+ mhchem) for math.
 *
 * Supported: `$...$` inline, `$$...$$` display, **bold**, *italic*, `code`,
 * paragraphs (blank line), bullet lists (`- `), single newlines → <br>.
 * Everything else is escaped. Output is safe to inject because all non-math
 * text is HTML-escaped and KaTeX output is generated, not user HTML.
 *
 * Runs on both server and client (KaTeX is isomorphic).
 */
import katex from "katex";
import "katex/contrib/mhchem";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      output: "htmlAndMathml",
    });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

const TOKEN = "\u0000";

/** Pull math out into placeholders so markdown processing never touches TeX. */
function extractMath(src: string): { text: string; math: string[] } {
  const math: string[] = [];
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src[i] === "\\" && src[i + 1] === "$") {
      out += "$";
      i += 2;
      continue;
    }
    if (src.startsWith("$$", i)) {
      const end = src.indexOf("$$", i + 2);
      if (end !== -1) {
        math.push(renderMath(src.slice(i + 2, end), true));
        out += `${TOKEN}${math.length - 1}${TOKEN}`;
        i = end + 2;
        continue;
      }
    }
    if (src[i] === "$") {
      const end = src.indexOf("$", i + 1);
      if (end !== -1 && end > i + 1) {
        math.push(renderMath(src.slice(i + 1, end), false));
        out += `${TOKEN}${math.length - 1}${TOKEN}`;
        i = end + 1;
        continue;
      }
    }
    out += src[i];
    i += 1;
  }
  return { text: out, math };
}

function inline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
}

export function renderMd(src: string | null | undefined): string {
  if (!src) return "";
  const { text, math } = extractMath(src.replace(/\r\n/g, "\n").trim());
  const blocks = text.split(/\n\s*\n/);
  const html = blocks
    .map((block) => {
      const lines = block.split("\n");
      const isList = lines.every((l) => /^\s*-\s+/.test(l));
      if (isList) {
        const items = lines
          .map((l) => `<li>${inline(escapeHtml(l.replace(/^\s*-\s+/, "")))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${lines.map((l) => inline(escapeHtml(l))).join("<br>")}</p>`;
    })
    .join("");
  return html.replace(new RegExp(`${TOKEN}(\\d+)${TOKEN}`, "g"), (_, n) => math[Number(n)]);
}
