"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Skeleton } from "@/components/ui";
import { questions, topics, getQuestion } from "@/lib/content";
import type { Question } from "@/lib/content/types";
import { selectNext } from "@/lib/select";
import { useHydrated, useStore } from "@/lib/store";
import { useSkills } from "@/lib/store/derived";
import { track } from "@/lib/analytics";

/**
 * Practice: adaptive by default, optional ?topic= filter. Picks the next
 * question client-side from the bundled bank, so it works offline.
 */
export function PracticeScreen() {
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
    const q = selectNext(questions, topics, skills, attempts, { topicId, excludeIds: recent });
    setCurrent(q);
  }, [skills, attempts, recent, topicId]);

  // First question once hydrated, and a fresh one whenever the topic filter
  // changes. Setting state during render is React's sanctioned way to derive
  // state from props; it re-renders immediately without a flash.
  const key = hydrated ? (topicId ?? "all") : null;
  if (key !== null && pickedFor !== key) {
    setPickedFor(key);
    setCurrent(selectNext(questions, topics, skills, attempts, { topicId, excludeIds: recent }));
  }
  useEffect(() => {
    if (key !== null) track("practice_started", { topic: key });
  }, [key]);

  const topicName = useMemo(() => topics.find((t) => t.id === topicId)?.name, [topicId]);

  if (!hydrated || !current) return <Skeleton className="h-72" />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <label className="sr-only" htmlFor="topic">Topic</label>
        <select
          id="topic"
          value={topicId ?? ""}
          onChange={(e) => router.replace(e.target.value ? `/practice?topic=${e.target.value}` : "/practice")}
          className="min-h-11 rounded-full border border-line bg-elev px-4 text-[14px] font-medium text-fg max-w-full"
        >
          <option value="">All topics (adaptive)</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <span className="ml-auto text-[13px] text-faint">{count} answered{topicName ? "" : ""}</span>
      </div>
      <QuestionCard
        key={current.id}
        question={getQuestion(current.id)!}
        mode="practice"
        onAnswer={() => setCount((c) => c + 1)}
        onNext={pick}
      />
    </div>
  );
}
