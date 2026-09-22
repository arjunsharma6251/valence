import { ImageResponse } from "next/og";
import { getQuestion, getTopic } from "@/lib/content";
import { texToPlain } from "@/lib/texplain";
import { ChemText, Frame, Group, OG, og } from "@/lib/og";
import { loadOgFonts } from "@/lib/og-fonts";

/**
 * Open Graph card for a question page: topic, the stem in plain Unicode,
 * and the four options. Rendered at build time for every bundled question,
 * so a pasted link previews as the question itself.
 */
export const alt = "A USNCO practice question on Valence";
export const size = OG;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = getQuestion(id);
  if (!q) return new ImageResponse(<Frame><div style={{ fontSize: 40 }}>Question not found</div></Frame>, { ...size, fonts: await loadOgFonts() });
  const stem = texToPlain(q.stem_md, { basicGlyphs: true });
  const long = stem.length > 220;
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <Frame meta={`${getTopic(q.topic_id)?.name ?? q.topic_id} · ${q.level === "local" ? "Local" : "National"} ${q.year}`} footer={q.source}>
        <ChemText size={long ? 30 : 36} text={stem.length > 340 ? stem.slice(0, 337) + "…" : stem} style={{ lineHeight: 1.3, marginTop: 4, fontWeight: 500, width: 1088 }} />
        <Group style={{ marginTop: 24 }}>
          {q.options.map((o, i) => (
            <div key={o.label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px", borderTop: i ? `1px solid ${og.sep}` : "none", fontSize: 24 }}>
              <div style={{ width: 34, height: 34, borderRadius: 999, border: `1.5px solid ${og.sep}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: og.label2 }}>{o.label}</div>
              <ChemText size={24} text={texToPlain(o.text_md, { basicGlyphs: true }).slice(0, 90)} style={{ flex: 1, overflow: "hidden" }} />
            </div>
          ))}
        </Group>
      </Frame>
    ),
    { ...size, fonts },
  );
}
