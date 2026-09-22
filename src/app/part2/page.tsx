import type { Metadata } from "next";
import Link from "next/link";
import { Card, Eyebrow, Pill } from "@/components/ui";
import { frq, getTopic } from "@/lib/content";

export const metadata: Metadata = { title: "Part II" };

/** Server Component: the FRQ list is static content, so it renders on the server with no client JS. */
export default function Page() {
  return (
    <div className="space-y-5">
      <header className="animate-rise">
        <h1 className="text-[24px] font-semibold tracking-tight">Part II — free response</h1>
        <p className="mt-1 text-[15px] text-muted leading-relaxed">
          Type your answer to each part and get it graded against a rubric, with what you missed and the model answer. Grades are AI-generated and labeled as such; five graded submissions per day.
        </p>
      </header>
      <ul className="space-y-3">
        {frq.map((p, i) => (
          <li key={p.id} className="animate-rise" style={{ animationDelay: `${60 + i * 40}ms` }}>
            <Link href={`/part2/${p.id}`} className="block">
              <Card className="hover:border-line-strong transition-colors">
                <Eyebrow>{p.year} · Problem {p.number} · {p.parts.reduce((s, x) => s + x.max_points, 0)} points</Eyebrow>
                <p className="mt-1 text-[17px] font-semibold">{p.title}</p>
                <p className="mt-1"><Pill tone="neutral">{getTopic(p.topic_id)?.name}</Pill></p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
