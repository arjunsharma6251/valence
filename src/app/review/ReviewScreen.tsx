"use client";
import { useEffect, useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Button, Card, Eyebrow, LinkButton, Skeleton } from "@/components/ui";
import { getQuestion } from "@/lib/content";
import { dismissCard } from "@/lib/store/actions";
import { useHydrated, useStore } from "@/lib/store";
import { useDueCards } from "@/lib/store/derived";
import { track } from "@/lib/analytics";

/**
 * Review: the SM-2 queue of missed questions. Cards are due immediately
 * when missed, then 1 day, 6 days, and growing. Dismiss removes a card.
 */
export function ReviewScreen() {
  const hydrated = useHydrated();
  const due = useDueCards();
  const cards = useStore((s) => s.cards);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [queue, setQueue] = useState<string[] | null>(null);

  // Snapshot the queue on entry so answering a card doesn't reorder mid-session.
  if (hydrated && queue === null) {
    setQueue(due.map((c) => c.question_id));
  }
  useEffect(() => {
    if (queue && queue.length) track("review_started", { due: queue.length });
  }, [queue]);

  if (!hydrated || queue === null) return <Skeleton className="h-64" />;

  const remaining = queue.slice(index).filter((id) => cards[id]);
  const currentId = remaining[0];
  const total = Object.keys(cards).length;

  if (!currentId) {
    return (
      <Card className="animate-rise">
        <Eyebrow>Review</Eyebrow>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight">{done ? `Done — ${done} reviewed.` : "Nothing due right now."}</h1>
        <p className="mt-2 text-[15px] text-muted leading-relaxed">
          {total ? `${total} question${total === 1 ? "" : "s"} scheduled. Missed questions come back the same day, then after 1 day, 6 days, and longer each time you get them right.` : "Questions you miss in Practice or a mock show up here on a spaced schedule."}
        </p>
        <div className="mt-4"><LinkButton href="/practice">Practice instead</LinkButton></div>
      </Card>
    );
  }

  const q = getQuestion(currentId)!;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-[13px] text-faint">
        <span>{remaining.length} due</span>
        <Button variant="ghost" className="ml-auto min-h-9 px-3 text-[13px]" onClick={() => { dismissCard(currentId); }}>Dismiss card</Button>
      </div>
      <QuestionCard
        key={currentId}
        question={q}
        mode="review"
        position={`${done + 1} of ${done + remaining.length}`}
        onNext={() => { setDone((d) => d + 1); setIndex((i) => i + 1); }}
        nextLabel={remaining.length > 1 ? "Next" : "Finish"}
      />
    </div>
  );
}
