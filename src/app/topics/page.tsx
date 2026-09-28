import type { Metadata } from "next";
import Link from "next/link";
import { Group, GroupFooter, GroupHeader, LargeTitle, Narrow, Row } from "@/components/ui";
import { byDifficulty, topicStats } from "@/lib/stats";
import { questions } from "@/lib/content";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "What's on the USNCO exam",
  description:
    "The ten topic blocks of the U.S. National Chemistry Olympiad, in the order they appear, with how hard national qualifiers actually found each one.",
  alternates: { canonical: "/topics" },
  openGraph: { title: "What's on the USNCO exam", description: "The ten USNCO topic blocks, ranked by how hard national qualifiers found them." },
};

function pct(x: number | null) {
  return x === null ? "—" : `${Math.round(x * 100)}%`;
}

export default function Page() {
  const stats = topicStats();
  const real = questions.filter((q) => !q.id.startsWith("seed-"));
  const ranked = byDifficulty(stats);
  const rated = stats.filter((s) => s.fieldAccuracy !== null);
  const ratedCount = rated.reduce((s, x) => s + x.rated, 0);

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "USNCO topic blocks",
    itemListElement: stats.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.topic.name,
      url: `${siteUrl}/topics/${s.topic.id}`,
    })),
  };

  return (
    <Narrow className="stagger">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <LargeTitle className="pt-1 pb-2">What&rsquo;s on the USNCO exam</LargeTitle>
      <p className="max-w-[56ch] text-[15px] text-ink-soft leading-relaxed pb-6">
        Both the local section exam and national Part I are 60 multiple-choice questions, and both walk through the same ten topics in the same
        order, six questions at a time. Knowing which block a question number belongs to is worth real points: you always know what is coming next.
      </p>

      <GroupHeader trailing="Question count">The exam</GroupHeader>
      <Group>
        <Row title="Local section exam" detail="60 multiple choice · 110 minutes · taken at your school or section in March" value={<span className="tnum">60</span>} />
        <Row title="National exam, Part I" detail="60 multiple choice · 90 minutes · ten blocks of six, in topic order" value={<span className="tnum">60</span>} />
        <Row title="National exam, Part II" detail="8 free-response problems · 105 minutes · graded against a rubric" value={<span className="tnum">8</span>} />
        <Row title="National exam, Part III" detail="2 laboratory problems · 90 minutes · practical work, not covered here" value={<span className="tnum">2</span>} />
      </Group>

      <GroupHeader trailing="Hardest first">Topics, by how hard they really are</GroupHeader>
      <Group>
        {ranked.map((s) => (
          <Row
            key={s.topic.id}
            href={`/topics/${s.topic.id}`}
            title={s.topic.name}
            detail={`Questions ${s.topic.questions} · ${s.count} in the bank`}
            value={<span className="tnum">{pct(s.fieldAccuracy)}</span>}
          >
            <span className="w-16 h-px bg-line shrink-0 relative" aria-hidden="true">
              <span className="absolute inset-y-[-1px] left-0 bg-ink" style={{ width: `${(s.fieldAccuracy ?? 0) * 100}%` }} />
            </span>
          </Row>
        ))}
      </Group>
      <GroupFooter>
        The percentage is the share of national qualifiers who answered correctly, from the item statistics ACS publishes with the national answer
        key, averaged over the {ratedCount} questions that carry one. Qualifiers are already a strong group, so a block where they average 38% is
        genuinely hard, not merely unfamiliar.
      </GroupFooter>

      <div className="pt-8">
        <p className="text-[15px] leading-relaxed max-w-[56ch]">
          Every one of the {real.length.toLocaleString()} questions below is from a past exam, tagged to its block.{" "}
          <Link href="/practice" className="text-accent">Start practicing</Link> and the next question is chosen from whichever block you are weakest in.
        </p>
      </div>
    </Narrow>
  );
}
