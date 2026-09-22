/**
 * Fonts for generated share images. Satori (next/og) only draws glyphs the
 * loaded fonts contain, and its bundled Noto Sans lacks the chemistry
 * symbols (⇌, −, subscript digits), so we load Noto Sans plus Noto Sans Math
 * at request time from the fontsource CDN and cache them in memory.
 */
// Passing any font replaces Satori's bundled set, so Latin comes from Noto Sans
// (400 + 700) and the equilibrium arrow / true minus from Noto Sans Math.
// Sub/superscripts are drawn structurally (see ChemText), not as Unicode glyphs.
const SOURCES = [
  { name: "Noto Sans", weight: 400 as const, url: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5/files/noto-sans-latin-400-normal.woff" },
  { name: "Noto Sans", weight: 700 as const, url: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5/files/noto-sans-latin-700-normal.woff" },
  { name: "Noto Sans Math", weight: 400 as const, url: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-math@5/files/noto-sans-math-math-400-normal.woff" },
];

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };
let cache: Promise<OgFont[]> | null = null;

export function loadOgFonts(): Promise<OgFont[]> {
  if (!cache) {
    cache = Promise.all(
      SOURCES.map(async (f) => {
        const res = await fetch(f.url, { cache: "force-cache" });
        if (!res.ok) throw new Error(`font ${f.url}: ${res.status}`);
        return { name: f.name, data: await res.arrayBuffer(), weight: f.weight, style: "normal" as const };
      }),
    ).catch((e) => {
      cache = null; // retry next time
      throw e;
    });
  }
  return cache;
}

/** Font stack for card text: Latin from Noto Sans, symbols fall through to Noto Sans Math. */
export const OG_FONT_FAMILY = '"Noto Sans", "Noto Sans Math"';
