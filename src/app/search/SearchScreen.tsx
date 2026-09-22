"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Md } from "@/components/Md";
import { Pill } from "@/components/ui";
import { getTopic, questions, searchQuestions } from "@/lib/content";

export function SearchScreen() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const results = useMemo(() => (q.trim() ? searchQuestions(q).slice(0, 50) : []), [q]);
  return (
    <div className="space-y-4">
      <label className="sr-only" htmlFor="search">Search questions</label>
      <input id="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${questions.length} questions…`} className="w-full min-h-12 rounded-full border border-line bg-elev px-5 text-[16px]" />
      <ul className="divide-y divide-line">
        {results.map((r) => (
          <li key={r.id}>
            <Link href={`/q/${r.id}`} className="block py-3 hover:text-accent">
              <p className="text-[12px] text-faint mb-1 flex gap-2 items-center"><Pill tone="neutral">{getTopic(r.topic_id)?.name}</Pill>{r.year} {r.level} · {r.subtopic}</p>
              <Md text={r.stem_md.slice(0, 160) + (r.stem_md.length > 160 ? "…" : "")} className="text-[14px] line-clamp-3" />
            </Link>
          </li>
        ))}
        {q.trim() && results.length === 0 && <li className="py-3 text-[14px] text-muted">No matches.</li>}
      </ul>
    </div>
  );
}
