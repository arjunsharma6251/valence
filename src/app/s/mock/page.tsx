import type { Metadata } from "next";
import { Group, GroupFooter, LargeTitle, LinkButton, Row } from "@/components/ui";
import { topics } from "@/lib/content";

/**
 * Share landing for a mock score. The score lives in the URL; the page shows
 * the card, explains what a mock is, and offers one action: take one.
 */
type SP = Promise<Record<string, string | string[] | undefined>>;

function parse(sp: Record<string, string | string[] | undefined>) {
  const s = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const level = s("l") === "national" ? "national" : "local";
  const correct = Number(s("c")) || 0;
  const total = Number(s("t")) || 60;
  const b = s("b");
  return { level, correct, total, b, query: `l=${level}&c=${correct}&t=${total}${b ? `&b=${encodeURIComponent(b)}` : ""}` };
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { level, correct, total, query } = parse(await searchParams);
  const title = `${correct}/${total} on a USNCO ${level === "local" ? "local" : "national"} mock`;
  return {
    title,
    description: "A timed mock exam on Valence, free adaptive USNCO practice.",
    openGraph: { title, images: [{ url: `/api/og/mock?${query}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [`/api/og/mock?${query}`] },
  };
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const { level, correct, total, b, query } = parse(await searchParams);
  const by = b.split(",").map((x) => x.split("-").map(Number)).filter((x) => x.length === 2);
  return (
    <div>
      <LargeTitle className="pt-1 pb-4">Mock score</LargeTitle>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/og/mock?${query}`} alt={`${correct} of ${total} on a ${level} mock`} width={1200} height={630} className="w-full h-auto rounded-[6px]" />
      {by.length > 0 && (
        <Group className="mt-4">
          {by.map(([c, t], i) => (
            <Row key={i} title={topics[i]?.name ?? `Topic ${i + 1}`} value={<span className="tnum">{c}/{t}</span>} />
          ))}
        </Group>
      )}
      <GroupFooter>Valence mocks are 60 questions drawn to the real USNCO topic mix, timed like the exam. Misses go straight to a spaced review queue.</GroupFooter>
      <div className="pt-4"><LinkButton href="/mock" className="w-full">Take a mock</LinkButton></div>
    </div>
  );
}
