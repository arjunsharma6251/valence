"use client";
import { useEffect, useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Button, Group, GroupFooter, LargeTitle, LinkButton, Narrow, Row, Skeleton } from "@/components/ui";
import { getQuestion } from "@/lib/content";
import { dismissCard } from "@/lib/store/actions";
import { useHydrated, useStore } from "@/lib/store";
import { useDueCards } from "@/lib/store/derived";
import { track } from "@/lib/analytics";

/** Review: the SM-2 queue of missed questions. Dismiss removes a card. */
export function ReviewScreen() {
  const hydrated = useHydrated();
  const due = useDueCards();
  const cards = useStore((s) => s.cards);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [queue, setQueue] = useState<string[] | null>(null);

  if (hydrated && queue === null) setQueue(due.map((c) => c.question_id));
  useEffect(() => {
    if (queue && queue.length) track("review_started", { due: queue.length });
  }, [queue]);

  if (!hydrated || queue === null) return <Skeleton className="h-64" />;

  const remaining = queue.slice(index).filter((id) => cards[id]);
  const currentId = remaining[0];
  const total = Object.keys(cards).length;
  const nextDue = Object.values(cards).map((c) => new Date(c.due_at)).filter((d) => d > new Date()).sort((a, b) => a.getTime() - b.getTime())[0];

  if (!currentId) {
    return (
      <Narrow>
        <LargeTitle className="pt-1 pb-4">Review</LargeTitle>
        <Group>
          <Row title={done ? `Done. ${done} reviewed.` : "Nothing due right now"} detail={total ? `${total} scheduled${nextDue ? ` · next ${nextDue.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}` : "Questions you miss show up here on a spaced schedule."} />
        </Group>
        <GroupFooter>Missed questions come back the same day, then after 1 day, 6 days, and longer each time you get them right.</GroupFooter>
        <div className="pt-4"><LinkButton href="/practice" variant="tinted" className="w-full">Practice instead</LinkButton></div>
      </Narrow>
    );
  }

  const q = getQuestion(currentId)!;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-footnote text-label-2 tnum">{remaining.length} due</span>
        <Button variant="plain" size="compact" className="min-h-[36px] text-footnote" onClick={() => dismissCard(currentId)}>Dismiss card</Button>
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
