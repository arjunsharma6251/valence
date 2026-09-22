"use client";
import { useMemo } from "react";
import { Group, GroupFooter, GroupHeader, LargeTitle, LinkButton, Row, Skeleton, Tag } from "@/components/ui";
import { IconMock, IconPartII, IconPractice, IconReview } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getTopic, questions, topics } from "@/lib/content";
import { accuracyByDay } from "@/lib/mastery";
import { PREDICTION_MIN } from "@/lib/predict";
import { useHydrated, useStore } from "@/lib/store";
import { useDueCards, usePrediction, useSkills, useWeakTopics } from "@/lib/store/derived";

/**
 * Home ("Summary"): where am I, what's due. One grouped list of the four
 * destinations with live status, the primary action under it, then weak
 * topics and the prediction. New users get a three-row explanation instead.
 */
export function HomeScreen() {
  const hydrated = useHydrated();
  const attempts = useStore((s) => s.attempts);
  const target = useStore((s) => s.profile.target) ?? "local";
  const mocks = useStore((s) => s.mocks);
  const skills = useSkills();
  const weak = useWeakTopics();
  const due = useDueCards();
  const prediction = usePrediction(target);
  const trend = useMemo(() => accuracyByDay(attempts, 30), [attempts]);
  const inProgress = mocks.find((m) => !m.submitted_at);
  const pastMocks = mocks.filter((m) => m.submitted_at);

  if (!hydrated) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-[180px]" />
        <Skeleton className="h-[50px]" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  const total = attempts.length;
  const week = trend.slice(-7).reduce((s, d) => ({ t: s.t + d.total, c: s.c + d.correct }), { t: 0, c: 0 });
  const weekAcc = week.t ? Math.round((100 * week.c) / week.t) : null;
  const lastMock = pastMocks[pastMocks.length - 1];

  return (
    <div>
      <LargeTitle className="pt-1 pb-4">Summary</LargeTitle>

      <Group insetIcon>
        <Row icon={<IconPractice />} title="Practice" detail={total ? `${total} answered` : "Adaptive across all topics"} href="/practice" />
        <Row icon={<IconMock />} title="Mock exam" detail={inProgress ? "In progress" : lastMock?.score ? `Last: ${lastMock.score.correct}/${lastMock.score.total}` : "Local 110 min · National 90 min"} href="/mock" value={inProgress ? <Tag tone="accent">Resume</Tag> : undefined} />
        <Row icon={<IconReview />} title="Review" detail={due.length ? "Missed questions, spaced" : "Nothing due right now"} href="/review" value={due.length ? <Tag tone="red">{due.length} due</Tag> : undefined} />
        <Row icon={<IconPartII />} title="Part II" detail="Free response, graded" href="/part2" />
      </Group>
      <div className="pt-3">
        <LinkButton href="/practice" className="w-full">{total ? "Continue practicing" : "Start practicing"}</LinkButton>
      </div>

      {total === 0 ? (
        <>
          <GroupHeader>How it works</GroupHeader>
          <Group>
            <Row title="Practice picks the question" detail="All ten ACS topics; it learns where you are weak. Tap or press 1–4." />
            <Row title="Review brings back misses" detail="Same day, then 1 day, 6 days, and longer as you get them right." />
            <Row title="Mock checks it under time" detail={`After ${PREDICTION_MIN} questions this screen shows weak topics and a rough predicted score.`} />
          </Group>
          <GroupFooter>{questions.length} questions in the bank right now. Progress is saved on this device; sign in to keep it across devices.</GroupFooter>
        </>
      ) : (
        <>
          <GroupHeader trailing="Weakest first">Topics</GroupHeader>
          <Group>
            {weak.slice(0, 6).map((s) => {
              const t = getTopic(s.topic_id);
              const acc = s.attempts ? Math.round((100 * s.correct) / s.attempts) : null;
              const weakRow = acc !== null && acc < 60;
              return (
                <Row
                  key={s.topic_id}
                  href={`/practice?topic=${s.topic_id}`}
                  title={t?.name ?? s.topic_id}
                  detail={s.attempts ? `${s.attempts} answered · rating ${Math.round(skills[s.topic_id]?.rating ?? 1500)}` : "Not tried yet"}
                  value={<span className={weakRow ? "text-red font-semibold" : ""}>{acc === null ? "—" : `${acc}%`}</span>}
                >
                  <span className="w-16 h-[3px] rounded-full bg-fill overflow-hidden shrink-0" aria-hidden="true">
                    <span className={`block h-full rounded-full ${weakRow ? "bg-red" : "bg-accent"}`} style={{ width: `${acc ?? 0}%` }} />
                  </span>
                </Row>
              );
            })}
          </Group>
          <GroupFooter>Tap a topic to practice only that topic. {topics.length} topics total.</GroupFooter>

          <GroupHeader trailing={`${target === "local" ? "Local exam" : "National Part I"}`}>Prediction</GroupHeader>
          <Group>
            <div className="px-4 py-3.5 flex items-end justify-between gap-4">
              <div className="min-w-0">
                {prediction ? (
                  <p className="text-title font-bold tracking-[-0.01em] leading-none tnum">
                    {prediction.score}<span className="text-body text-label-2 font-medium"> / {prediction.total}</span>
                    {prediction.rough && <Tag tone="orange" className="ml-2 align-middle">rough</Tag>}
                  </p>
                ) : (
                  <p className="text-body text-label-2">{PREDICTION_MIN - total} more answers unlock a prediction.</p>
                )}
                <p className="mt-1 text-footnote text-label-2 whitespace-nowrap">Predicted score</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-title font-bold tracking-[-0.01em] leading-none tnum">{weekAcc === null ? "—" : `${weekAcc}%`}</p>
                <p className="mt-1 text-footnote text-label-2 whitespace-nowrap">Last 7 days</p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <Trend data={trend} />
            </div>
          </Group>
        </>
      )}

      <GroupHeader>Appearance</GroupHeader>
      <Group>
        <Row title="Theme">
          <ThemeToggle />
        </Row>
      </Group>
    </div>
  );
}

/** 30-day accuracy: one bar per day, height = accuracy, muted when no attempts. */
function Trend({ data }: { data: { day: string; total: number; correct: number }[] }) {
  return (
    <div className="flex items-end gap-[3px] h-12" role="img" aria-label="Accuracy over the last 30 days">
      {data.map((d) => {
        const pct = d.total ? Math.max(8, (100 * d.correct) / d.total) : 0;
        return (
          <div key={d.day} className="flex-1 flex items-end h-full" title={d.total ? `${d.day}: ${d.correct} of ${d.total}` : d.day}>
            <div className={`w-full rounded-[2px] ${d.total ? "bg-accent" : "bg-fill"}`} style={{ height: d.total ? `${pct}%` : "3px" }} />
          </div>
        );
      })}
    </div>
  );
}
