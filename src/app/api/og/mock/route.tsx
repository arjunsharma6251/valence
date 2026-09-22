import { ImageResponse } from "next/og";
import { topics } from "@/lib/content";
import { Frame, Group, Mono, OG, og } from "@/lib/og";
import { OG_SERIF } from "@/lib/og-fonts";
import { loadOgFonts } from "@/lib/og-fonts";

/**
 * GET /api/og/mock?l=local&c=41&t=60&b=5-6,4-6,...
 * Score-card image for a completed mock. All data is in the query so the
 * card works without an account; `b` is per-topic "correct-total" pairs in
 * topics.json order. Used as the share page's Open Graph image and for the
 * "Save image" action on the score report.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const level = p.get("l") === "national" ? "National Part I" : "Local exam";
  const correct = Math.max(0, Math.min(999, Number(p.get("c") ?? 0)));
  const total = Math.max(1, Math.min(999, Number(p.get("t") ?? 60)));
  const by = (p.get("b") ?? "").split(",").map((x) => x.split("-").map(Number)).filter((x) => x.length === 2 && x.every(Number.isFinite));
  const pct = Math.round((100 * correct) / total);
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <Frame meta={`${level} · timed mock`} footer="60 questions drawn to the real topic mix · usevalence.app">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
          <div style={{ fontFamily: OG_SERIF, fontSize: 124, letterSpacing: -4, lineHeight: 1 }}>{String(correct)}</div>
          <div style={{ fontFamily: OG_SERIF, fontSize: 44, color: og.inkSoft, paddingBottom: 12 }}>{`/ ${total} · ${pct}%`}</div>
        </div>
        <div style={{ display: "flex", marginTop: 10 }}><Mono>Mock score</Mono></div>
        {by.length > 0 && (
          <Group style={{ marginTop: 26, padding: "6px 0" }}>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {by.slice(0, 10).map(([c, t], i) => {
                const name = (topics[i]?.name ?? `Topic ${i + 1}`).split(" and ")[0];
                const w = t ? (100 * c) / t : 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, width: "50%", padding: "7px 20px 7px 0", fontSize: 20 }}>
                    <div style={{ display: "flex", width: 220, color: og.inkSoft, overflow: "hidden", whiteSpace: "nowrap" }}>{name}</div>
                    <div style={{ display: "flex", flex: 1, height: 2, background: og.line }}>
                      <div style={{ display: "flex", width: `${w}%`, height: 2, background: w < 60 ? og.red : og.ink }} />
                    </div>
                    <div style={{ display: "flex", width: 54, justifyContent: "flex-end", fontWeight: 500 }}>{`${c}/${t}`}</div>
                  </div>
                );
              })}
            </div>
          </Group>
        )}
      </Frame>
    ),
    { ...OG, fonts, headers: { "cache-control": "public, max-age=31536000, immutable" } },
  );
}
