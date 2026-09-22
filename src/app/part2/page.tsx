import type { Metadata } from "next";
import { Group, GroupFooter, LargeTitle, Row } from "@/components/ui";
import { frq, getTopic } from "@/lib/content";

export const metadata: Metadata = { title: "Part II" };

/** Server Component: static FRQ list, no client JS. */
export default function Page() {
  return (
    <div>
      <LargeTitle className="pt-1 pb-4">Part II</LargeTitle>
      <Group>
        {frq.map((p) => (
          <Row
            key={p.id}
            href={`/part2/${p.id}`}
            title={p.title}
            detail={`${p.year} · Problem ${p.number} · ${getTopic(p.topic_id)?.name}`}
            value={<span className="tnum">{p.parts.reduce((s, x) => s + x.max_points, 0)} pt</span>}
          />
        ))}
      </Group>
      <GroupFooter>Type an answer to each part and get it graded against a rubric, with what you missed and the model answer. Grades are AI-generated and labeled as such. Five graded submissions per day.</GroupFooter>
    </div>
  );
}
