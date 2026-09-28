import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Group, GroupFooter, GroupHeader, LargeTitle, Narrow, Row } from "@/components/ui";
import { LinkButton } from "@/components/ui";
import { topics } from "@/lib/content";
import { getTopicStats, topicStats } from "@/lib/stats";
import { siteUrl } from "@/lib/site";
import { texToPlain } from "@/lib/texplain";

export function generateStaticParams() {
  return topics.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/topics/[id]">): Promise<Metadata> {
  const { id } = await params;
  const s = getTopicStats(id);
  if (!s) return { title: "Topic" };
  const acc = s.fieldAccuracy === null ? "" : ` National qualifiers average ${Math.round(s.fieldAccuracy * 100)}% on it.`;
  const title = `${s.topic.name} on the USNCO exam`;
  const description = `Questions ${s.topic.questions} of every USNCO local and national exam cover ${s.topic.name.toLowerCase()}.${acc} Practice ${s.count} real questions free.`;
  return { title, description, alternates: { canonical: `/topics/${id}` }, openGraph: { title, description } };
}

const ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`;
}

function rank(id: string): { position: number; total: number } {
  const ordered = [...topicStats()].sort((a, b) => (a.fieldAccuracy ?? 2) - (b.fieldAccuracy ?? 2));
  return { position: ordered.findIndex((s) => s.topic.id === id) + 1, total: ordered.length };
}

export default async function Page({ params }: PageProps<"/topics/[id]">) {
  const { id } = await params;
  const s = getTopicStats(id);
  if (!s) notFound();
  const { position, total } = rank(id);
  const acc = s.fieldAccuracy === null ? null : Math.round(s.fieldAccuracy * 100);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${s.topic.name} on the USNCO exam`,
    about: s.topic.name,
    isPartOf: { "@type": "WebSite", "@id": `${siteUrl}/#website` },
    url: `${siteUrl}/topics/${id}`,
  };

  return (
    <Narrow className="stagger">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Link href="/topics" className="mono inline-flex items-center min-h-[36px] hover:text-ink">All topics</Link>
      <LargeTitle className="pt-1 pb-2">{s.topic.name}</LargeTitle>
      <p className="max-w-[56ch] text-[15px] text-ink-soft leading-relaxed pb-7">
        This is block {s.topic.block} of {total}, questions {s.topic.questions} on both the local section exam and national Part I.
        {acc !== null && (
          <> Across the {s.rated} national questions where ACS published item statistics, qualifiers answered {acc}% correctly, which makes it{" "}
            {position === 1 ? `the hardest of the ${total} blocks` : position === total ? `the most approachable of the ${total}` : `the ${ordinal(position)} hardest of the ${total}`}.</>
        )}
      </p>

      <div className="pb-8">
        <LinkButton href={`/practice?topic=${id}`}>Practice {s.count} questions</LinkButton>
      </div>

      <GroupHeader>What it covers</GroupHeader>
      <Group>
        <div className="py-3 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
          {s.topic.subtopics.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      </Group>

      {s.hardest.length > 0 && (
        <>
          <GroupHeader trailing="% who got it right">Where qualifiers lose points</GroupHeader>
          <Group>
            {s.hardest.map((q) => (
              <Row
                key={q.id}
                href={`/q/${q.id}`}
                title={texToPlain(q.stem_md).slice(0, 110)}
                detail={`${q.year} national · question ${q.number}`}
                value={<span className="tnum">{Math.round((q.field_percent_correct as number) * 100)}%</span>}
              />
            ))}
          </Group>
          <GroupFooter>
            These are the {s.topic.name.toLowerCase()} questions the fewest national qualifiers answered correctly. If you can do these, the block is not
            your problem.
          </GroupFooter>
        </>
      )}

      <div className="pt-8">
        <p className="text-[15px] leading-relaxed max-w-[56ch]">
          Every question is from a published past exam and carries its source. Practice adapts to what you miss, and anything you get wrong comes back on a
          spaced schedule. No account needed. <Link href="/topics" className="text-accent">See the other nine blocks.</Link>
        </p>
      </div>
    </Narrow>
  );
}
