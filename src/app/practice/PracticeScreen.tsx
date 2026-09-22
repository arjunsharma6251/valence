"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Skeleton, usePageTitle } from "@/components/ui";
import { IconChevron } from "@/components/icons";
import { questions, topics, getQuestion } from "@/lib/content";
import type { Question } from "@/lib/content/types";
import { selectNext } from "@/lib/select";
import { useHydrated, useStore } from "@/lib/store";
import { useSkills } from "@/lib/store/derived";
import { track } from "@/lib/analytics";

/**
 * Practice: adaptive by default, optional ?topic= filter shown as a
 * list-row select. Picks the next question client-side, so it works offline.
 */
export function PracticeScreen() {
  usePageTitle("Practice");
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const topicId = params.get("topic");
  const skills = useSkills();
  const attempts = useStore((s) => s.attempts);
  const recent = useStore((s) => s.recent_ids);
  const [current, setCurrent] = useState<Question | null>(null);
  const [count, setCount] = useState(0);
  const [pickedFor, setPickedFor] = useState<string | null>(null);

  const pick = useCallback(() => {
    setCurrent(selectNext(questions, topics, skills, attempts, { topicId, excludeIds: recent }));
  }, [skills, attempts, recent, topicId]);

  // First question once hydrated, and a fresh one when the topic changes
  // (state derived during render, React's sanctioned pattern).
  const key = hydrated ? (topicId ?? "all") : null;
  if (key !== null && pickedFor !== key) {
    setPickedFor(key);
    setCurrent(selectNext(questions, topics, skills, attempts, { topicId, excludeIds: recent }));
  }
  useEffect(() => {
    if (key !== null) track("practice_started", { topic: key });
  }, [key]);

  if (!hydrated || !current) return <div className="space-y-3"><Skeleton className="h-11" /><Skeleton className="h-64" /></div>;

  return (
    <div>
      <div className="mb-4 rounded-[var(--radius-group)] bg-group flex items-center px-4 min-h-[44px] relative">
        <label htmlFor="topic" className="text-body">Topic</label>
        <select
          id="topic"
          value={topicId ?? ""}
          onChange={(e) => router.replace(e.target.value ? `/practice?topic=${e.target.value}` : "/practice")}
          className="row-select flex-1 min-h-[44px] text-body cursor-pointer"
        >
          <option value="">All topics (adaptive)</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <IconChevron size={18} className="absolute right-3 text-label-3 rotate-90 pointer-events-none" />
        <span className="sr-only">{count} answered this session</span>
      </div>
      <QuestionCard key={current.id} question={getQuestion(current.id)!} mode="practice" onAnswer={() => setCount((c) => c + 1)} onNext={pick} position={count ? `${count} answered` : undefined} />
    </div>
  );
}
