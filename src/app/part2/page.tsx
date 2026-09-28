import type { Metadata } from "next";
import Link from "next/link";
import { Group, GroupFooter, GroupHeader, LargeTitle, Narrow, Row } from "@/components/ui";
import { frq, getTopic, topics } from "@/lib/content";

export const metadata: Metadata = {
  title: "Part II",
  description: "Real USNCO national free-response problems, graded against the official key part by part. Type an answer or photograph your written work.",
};

/** A short, self-contained problem that shows what grading does. */
const FEATURED = "2026-N-P5";

/** Exam position is a real frame for students: problem 5 is always net equations. */
const POSITION: Record<number, string> = {
  1: "Stoichiometry and lab",
  2: "Equilibrium",
  3: "Thermodynamics",
  4: "Kinetics",
  5: "Net equations",
  6: "Structure and redox",
  7: "Bonding and solids",
  8: "Organic",
};

function points(p: (typeof frq)[number]) {
  return p.parts.reduce((s, x) => s + x.max_points, 0);
}

/** Server Component: static list, grouped by topic, no client JS. */
export default function Page() {
  const featured = frq.find((p) => p.id === FEATURED) ?? frq[0];
  const byTopic = topics
    .map((t) => ({ topic: t, problems: frq.filter((p) => p.topic_id === t.id).sort((a, b) => b.year - a.year || a.number - b.number) }))
    .filter((g) => g.problems.length > 0);

  return (
    <Narrow className="stagger">
      <LargeTitle className="pt-1 pb-2">Part II</LargeTitle>
      <p className="max-w-[54ch] text-[15px] text-ink-soft leading-relaxed pb-7">
        The free-response half of the national exam: {frq.length} real problems, {frq.reduce((s, p) => s + p.parts.length, 0)} sub-parts.
        Type an answer or photograph your written work, and every part comes back scored against the official key with what was missing.
      </p>

      <GroupHeader trailing="8 minutes">Start here</GroupHeader>
      <Group>
        <Link href={`/part2/${featured.id}`} className="group block py-4">
          <span className="mono block">{featured.year} · Problem {featured.number} · {points(featured)} points</span>
          <span className="serif block mt-2 text-[24px] md:text-[26px] leading-none tracking-[-0.01em] group-hover:text-accent transition-[color] duration-150">
            {featured.title}
          </span>
          <span className="block mt-2.5 text-[14px] text-ink-soft leading-relaxed">
            Six short answers, one line each, and no figures to read. The fastest way to see what the grader gives you back.
          </span>
        </Link>
      </Group>

      {byTopic.map((g) => (
        <div key={g.topic.id}>
          <GroupHeader trailing={`${g.problems.length}`}>{g.topic.name}</GroupHeader>
          <Group>
            {g.problems.map((p) => (
              <Row
                key={p.id}
                href={`/part2/${p.id}`}
                title={p.title}
                detail={`${p.year} · Problem ${p.number} · ${POSITION[p.number] ?? getTopic(p.topic_id)?.name} · ${p.parts.length} parts`}
                value={<span className="tnum">{points(p)} pt</span>}
              />
            ))}
          </Group>
        </div>
      ))}

      <GroupFooter>
        Answers are graded by a model against the official rubric, so treat the score as a guide rather than an official mark. Five graded submissions a day.
      </GroupFooter>
    </Narrow>
  );
}
