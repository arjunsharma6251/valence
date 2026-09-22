import { ImageResponse } from "next/og";
import { topics } from "@/lib/content";
import { Frame, Group, OG, og } from "@/lib/og";
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
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 4 }}>
          <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>{String(correct)}</div>
          <div style={{ fontSize: 44, color: og.label2, paddingBottom: 14 }}>{`/ ${total} · ${pct}%`}</div>
        </div>
        {by.length > 0 && (
          <Group style={{ marginTop: 20, padding: "6px 0" }}>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {by.slice(0, 10).map(([c, t], i) => {
                const name = (topics[i]?.name ?? `Topic ${i + 1}`).split(" and ")[0];
                const w = t ? (100 * c) / t : 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, width: "50%", padding: "5px 20px", fontSize: 20 }}>
                    <div style={{ display: "flex", width: 220, color: og.label2, overflow: "hidden", whiteSpace: "nowrap" }}>{name}</div>
                    <div style={{ display: "flex", flex: 1, height: 8, borderRadius: 999, background: "#e5e5ea" }}>
                      <div style={{ display: "flex", width: `${w}%`, height: 8, borderRadius: 999, background: w < 60 ? og.red : og.accent }} />
                    </div>
                    <div style={{ display: "flex", width: 54, justifyContent: "flex-end", fontWeight: 600 }}>{`${c}/${t}`}</div>
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
