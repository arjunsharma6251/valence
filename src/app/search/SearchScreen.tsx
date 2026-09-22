"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Md } from "@/components/Md";
import { Group, GroupFooter, LargeTitle, Narrow } from "@/components/ui";
import { IconSearch } from "@/components/icons";
import { getTopic, questions, searchQuestions } from "@/lib/content";

export function SearchScreen() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const results = useMemo(() => (q.trim() ? searchQuestions(q).slice(0, 50) : []), [q]);
  return (
    <Narrow>
      <LargeTitle className="pt-1 pb-4">Search</LargeTitle>
      <div className="relative">
        <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
        <label className="sr-only" htmlFor="search">Search questions</label>
        <input id="search" autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${questions.length} questions`} className="w-full min-h-[44px] rounded-[4px] border border-line bg-canvas pl-10 pr-4 text-[16px] focus:border-ink outline-none" />
      </div>
      {results.length > 0 && (
        <Group className="mt-4">
          {results.map((r) => (
            <Link key={r.id} href={`/q/${r.id}`} className="block py-3 hover:bg-canvas-2 active:bg-canvas-2">
              <p className="text-[13px] text-ink-soft mb-0.5">{getTopic(r.topic_id)?.name} · {r.year} {r.level} · {r.subtopic}</p>
              <Md text={r.stem_md.slice(0, 160) + (r.stem_md.length > 160 ? "…" : "")} className="text-[15px] line-clamp-3" />
            </Link>
          ))}
        </Group>
      )}
      {q.trim() && results.length === 0 && <GroupFooter>No matches for “{q}”.</GroupFooter>}
    </Narrow>
  );
}
