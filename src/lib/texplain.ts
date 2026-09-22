/**
 * Mini-markdown + TeX/mhchem → plain Unicode text, for places that cannot
 * run KaTeX: Open Graph images, page descriptions, share text.
 * Lossy on purpose; good enough to read "H₂SO₄ + 2 NaOH → Na₂SO₄ + 2 H₂O".
 */
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "(": "₍", ")": "₎" };
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "(": "⁽", ")": "⁾", n: "ⁿ", x: "ˣ" };

const map = (s: string, t: Record<string, string>) => [...s].map((c) => t[c] ?? c).join("");

const SYMBOLS: [RegExp, string][] = [
  [/\\times/g, "×"], [/\\cdot/g, "·"], [/\\Delta ?/g, "Δ"], [/\\delta ?/g, "δ"], [/\\lambda ?/g, "λ"], [/\\mu ?/g, "μ"], [/\\pi ?/g, "π"], [/\\nu ?/g, "ν"], [/\\alpha ?/g, "α"], [/\\beta ?/g, "β"], [/\\gamma ?/g, "γ"],
  [/\\circ/g, "°"], [/\\degree/g, "°"], [/\\pm/g, "±"], [/\\approx/g, "≈"], [/\\neq?/g, "≠"], [/\\leq?/g, "≤"], [/\\geq?/g, "≥"], [/\\infty/g, "∞"], [/\\rightarrow|\\to/g, "→"], [/\\leftarrow/g, "←"], [/\\rightleftharpoons|\\leftrightarrow/g, "⇌"], [/\\ldots|\\dots/g, "…"], [/\\%/g, "%"], [/\\,|\;|\\ |\\quad|\\!/g, " "],
];

function ce(inner: string): string {
  // mhchem: digits after a letter/paren are subscripts; ^{..} charges superscript; arrows.
  let s = inner
    .replace(/<=>|<-->/g, " ⇌ ")
    .replace(/->/g, " → ")
    .replace(/<-/g, " ← ")
    .replace(/\^\{([^}]*)\}/g, (_, c) => map(c, SUP))
    .replace(/\^(\d*[+-])/g, (_, c) => map(c, SUP))
    .replace(/_\{([^}]*)\}/g, (_, c) => map(c, SUB))
    .replace(/(?<=[A-Za-z\)\]])(\d+)/g, (_, d) => map(d, SUB))
    .replace(/(?<=[A-Za-z0-9\)\]])([+-])(?=[\s/),.;]|$)/g, (_, c) => map(c, SUP))
    .replace(/\(([a-z]{1,2})\)/g, "($1)");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function tex(inner: string): string {
  let s = inner;
  s = s.replace(/\\ce\{((?:[^{}]|\{[^{}]*\})*)\}/g, (_, c) => ce(c));
  s = s.replace(/\\(?:text|mathrm|mathit|textbf|mathbf)\{([^}]*)\}/g, "$1");
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\{([^}]*)\}/g, "√($1)");
  s = s.replace(/\\log_\{?(\d+)\}?/g, "log$1").replace(/\\(log|ln|sin|cos|tan|exp)/g, "$1");
  for (const [re, rep] of SYMBOLS) s = s.replace(re, rep);
  s = s.replace(/\^°/g, "°").replace(/\^\{([^}]*)\}/g, (_, c) => map(c, SUP)).replace(/\^([0-9+\-])/g, (_, c) => map(c, SUP));
  s = s.replace(/_\{([^}]*)\}/g, (_, c) => map(c, SUB)).replace(/_([0-9])/g, (_, c) => map(c, SUB)).replace(/_([A-Za-z]{1,4})\b/g, "$1");
  s = s.replace(/\\left|\\right/g, "").replace(/[{}]/g, "").replace(/\\([A-Za-z]+)/g, "$1");
  // Printed exams set a true minus sign, not a hyphen.
  s = s.replace(/(^|[\s=(])-(?=\d)/g, "$1−").replace(/\s-\s/g, " − ");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * @param opts.basicGlyphs replace characters missing from common sans fonts
 *   (the equilibrium arrow ⇌) with safe equivalents; used for generated images.
 */
export function texToPlain(src: string | null | undefined, opts: { basicGlyphs?: boolean } = {}): string {
  if (!src) return "";
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("$$", i)) {
      const end = src.indexOf("$$", i + 2);
      if (end !== -1) { out += " " + tex(src.slice(i + 2, end)) + " "; i = end + 2; continue; }
    }
    if (src[i] === "$") {
      const end = src.indexOf("$", i + 1);
      if (end !== -1 && end > i + 1) { out += tex(src.slice(i + 1, end)); i = end + 1; continue; }
    }
    out += src[i];
    i += 1;
  }
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();
  if (opts.basicGlyphs) out = out.replace(/⇌/g, "\u21cc");
  return out;
}
