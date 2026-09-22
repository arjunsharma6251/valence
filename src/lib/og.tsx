/**
 * Shared pieces for generated share images (Open Graph cards). Satori
 * supports flexbox only, so everything here is display:flex.
 * Colors mirror the light theme tokens in globals.css.
 */
import type { ReactNode } from "react";
import { OG_FONT_FAMILY } from "./og-fonts";

export const OG = { width: 1200, height: 630 };
export const og = {
  ground: "#f2f2f7",
  group: "#ffffff",
  label: "#1c1c1e",
  label2: "#6e6e73",
  sep: "rgba(60,60,67,0.16)",
  accent: "#0066cc",
  accentTint: "rgba(0,102,204,0.12)",
  green: "#187a3c",
  red: "#c5281f",
};

export function Frame({ children, footer, meta }: { children: ReactNode; footer?: string; meta?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: og.ground, padding: 56, fontFamily: OG_FONT_FAMILY, color: og.label }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, lineHeight: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Valence</div>
          {meta && <div style={{ fontSize: 22, color: og.label2 }}>{meta}</div>}
        </div>
        <div style={{ fontSize: 22, color: og.label2 }}>Free USNCO practice</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 36 }}>{children}</div>
      {footer && <div style={{ fontSize: 20, color: og.label2, marginTop: 24 }}>{footer}</div>}
    </div>
  );
}

export function Group({ children, style = {} }: { children: ReactNode; style?: Record<string, string | number> }) {
  return <div style={{ display: "flex", flexDirection: "column", background: og.group, borderRadius: 24, overflow: "hidden", ...style }}>{children}</div>;
}

const SUBS = "₀₁₂₃₄₅₆₇₈₉₊₋₍₎";
const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿˣ";
const SUB_BASE = "0123456789+-()";
const SUP_BASE = "0123456789+-()nx";

function runs(word: string, keyBase: number, size: number): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = "";
  let key = keyBase;
  const small = Math.round(size * 0.66);
  const flush = () => { if (buf) { out.push(<span key={key++}>{buf}</span>); buf = ""; } };
  for (const ch of word) {
    const si = SUBS.indexOf(ch);
    const pi = SUPS.indexOf(ch);
    if (si >= 0) { flush(); out.push(<span key={key++} style={{ fontSize: small, transform: `translateY(${Math.round(size * 0.2)}px)` }}>{SUB_BASE[si]}</span>); }
    else if (pi >= 0) { flush(); out.push(<span key={key++} style={{ fontSize: small, transform: `translateY(${-Math.round(size * 0.4)}px)` }}>{SUP_BASE[pi]}</span>); }
    else buf += ch;
  }
  flush();
  return out;
}

/**
 * Renders plain-Unicode chemistry (from texToPlain) as its own wrapping flex
 * container: one flex item per word, with sub- and superscripts drawn as
 * smaller shifted spans so the card never depends on a font shipping the
 * Unicode sub/superscript glyphs. It must own the container: Satori does not
 * flatten a Fragment placed directly inside a flex-wrap parent.
 * `size` is the font size in px (Satori needs absolute lengths).
 */
export function ChemText({ text, size, style = {} }: { text: string; size: number; style?: Record<string, string | number> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", fontSize: size, ...style }}>
      {text.split(/\s+/).filter(Boolean).map((word, i) => (
        <span key={i} style={{ display: "flex", alignItems: "baseline", marginRight: Math.round(size * 0.27) }}>{runs(word, i * 100, size)}</span>
      ))}
    </div>
  );
}
