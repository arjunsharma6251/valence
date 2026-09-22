"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Md } from "@/components/Md";
import { Group, GroupFooter, LargeTitle } from "@/components/ui";
import { IconSearch } from "@/components/icons";
import { getTopic, questions, searchQuestions } from "@/lib/content";

export function SearchScreen() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const results = useMemo(() => (q.trim() ? searchQuestions(q).slice(0, 50) : []), [q]);
  return (
    <div>
      <LargeTitle className="pt-1 pb-4">Search</LargeTitle>
      <div className="relative">
        <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-label-3" />
        <label className="sr-only" htmlFor="search">Search questions</label>
        <input id="search" autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${questions.length} questions`} className="w-full min-h-[44px] rounded-[10px] bg-fill/70 pl-10 pr-4 text-body focus:bg-group focus:ring-2 focus:ring-accent outline-none" />
      </div>
      {results.length > 0 && (
        <Group className="mt-4">
          {results.map((r) => (
            <Link key={r.id} href={`/q/${r.id}`} className="block px-4 py-3 hover:bg-fill/60 active:bg-fill">
              <p className="text-footnote text-label-2 mb-0.5">{getTopic(r.topic_id)?.name} · {r.year} {r.level} · {r.subtopic}</p>
              <Md text={r.stem_md.slice(0, 160) + (r.stem_md.length > 160 ? "…" : "")} className="text-subhead line-clamp-3" />
            </Link>
          ))}
        </Group>
      )}
      {q.trim() && results.length === 0 && <GroupFooter>No matches for “{q}”.</GroupFooter>}
    </div>
  );
}
