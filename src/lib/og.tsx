/**
 * Shared pieces for generated share images (Open Graph cards). Satori
 * supports flexbox only, so everything here is display:flex.
 * Colors mirror the light theme tokens in globals.css.
 */
import type { ReactNode } from "react";
import { OG_FONT_FAMILY, OG_MONO, OG_SERIF } from "./og-fonts";

export const OG = { width: 1200, height: 630 };
export const og = {
  canvas: "#faf8f5",
  canvas2: "#f3efe8",
  ink: "#16130f",
  inkSoft: "#57514a",
  grey: "#97907f",
  line: "#eae5db",
  accent: "#1d4ed8",
  green: "#1a7a45",
  red: "#c8302a",
};

/** Mono label, the card's equivalent of the site's `.mono`. */
export function Mono({ children, color = og.inkSoft }: { children: ReactNode; color?: string }) {
  return <div style={{ display: "flex", fontFamily: OG_MONO, fontSize: 18, letterSpacing: 1, textTransform: "uppercase", color }}>{children}</div>;
}

/** Card frame in the site's editorial language: warm canvas, hairlines, serif wordmark with the lone-pair dots. */
export function Frame({ children, footer, meta }: { children: ReactNode; footer?: string; meta?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: og.canvas, padding: 56, fontFamily: OG_FONT_FAMILY, color: og.ink }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 22, borderBottom: `1px solid ${og.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", fontFamily: OG_SERIF, fontSize: 34, letterSpacing: -1, lineHeight: 1 }}>valence</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: og.accent }} />
              <div style={{ width: 6, height: 6, borderRadius: 999, background: og.accent }} />
            </div>
          </div>
          {meta && <Mono>{meta}</Mono>}
        </div>
        <Mono color={og.grey}>Free USNCO practice</Mono>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 34 }}>{children}</div>
      {footer && <div style={{ display: "flex", paddingTop: 18, borderTop: `1px solid ${og.line}` }}><Mono color={og.grey}>{footer}</Mono></div>}
    </div>
  );
}

/** Hairline list: rows separated by 1px lines, no box. */
export function Group({ children, style = {} }: { children: ReactNode; style?: Record<string, string | number> }) {
  return <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${og.line}`, borderBottom: `1px solid ${og.line}`, ...style }}>{children}</div>;
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
