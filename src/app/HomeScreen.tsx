"use client";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Group, GroupFooter, GroupHeader, LargeTitle, Row, Skeleton, Tag } from "@/components/ui";
import { CountUp } from "@/components/CountUp";
import { IconMock, IconPartII, IconPractice, IconReview } from "@/components/icons";
import { getTopic, questions } from "@/lib/content";
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

  const dest = [
    { href: "/practice", Icon: IconPractice, name: "Practice", status: total ? `${total} answered` : "Start here", tag: null as ReactNode },
    { href: "/mock", Icon: IconMock, name: "Mock exam", status: inProgress ? "In progress" : lastMock?.score ? `Last ${lastMock.score.correct}/${lastMock.score.total}` : "Timed, 60 questions", tag: inProgress ? <Tag tone="accent">Resume</Tag> : null },
    { href: "/review", Icon: IconReview, name: "Review", status: due.length ? `${due.length} due` : "Nothing due", tag: due.length ? <Tag tone="red">{due.length}</Tag> : null },
    { href: "/part2", Icon: IconPartII, name: "Part II", status: "Graded free response", tag: null },
  ];

  return (
    <div>
      <div className="flex items-end justify-between gap-4 pb-4 md:pb-6">
        <LargeTitle className="pt-1">Summary</LargeTitle>
        {total > 0 && <p className="text-footnote text-label-2 tnum pb-2">{weekAcc === null ? "" : `${weekAcc}% this week`}</p>}
      </div>

      <ul className="stagger grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {dest.map(({ href, Icon, name, status, tag }) => (
          <li key={href}>
            <Link href={href} className="lift group flex flex-col gap-3 rounded-[var(--radius-group)] bg-group p-4 min-h-[112px] md:min-h-[124px]">
              <span className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-[9px] bg-accent-tint text-accent inline-flex items-center justify-center"><Icon size={20} /></span>
                {tag}
              </span>
              <span className="mt-auto">
                <span className="block font-display font-semibold text-headline tracking-[-0.01em]">{name}</span>
                <span className="block text-footnote text-label-2 truncate">{status}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {total === 0 ? (
        <div className="md:max-w-[640px] animate-rise [animation-delay:160ms]">
          <GroupHeader>How it works</GroupHeader>
          <Group>
            <Row title="Practice picks the question" detail="All ten ACS topics; it learns where you are weak. Tap or press 1–4." />
            <Row title="Review brings back misses" detail="Same day, then 1 day, 6 days, and longer as you get them right." />
            <Row title="Mock checks it under time" detail={`After ${PREDICTION_MIN} questions this screen shows weak topics and a rough predicted score.`} />
          </Group>
          <GroupFooter>{questions.length} questions in the bank. Progress is saved on this device; sign in to keep it across devices.</GroupFooter>
        </div>
      ) : (
        <div className="stagger md:grid md:grid-cols-2 md:gap-x-6 md:items-start">
          <div>
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
                      <span className={`grow block h-full rounded-full ${weakRow ? "bg-red" : "bg-accent"}`} style={{ width: `${acc ?? 0}%` }} />
                    </span>
                  </Row>
                );
              })}
            </Group>
            <GroupFooter>Tap a topic to practice only that topic.</GroupFooter>
          </div>
          <div>
            <GroupHeader trailing={`${target === "local" ? "Local exam" : "National Part I"}`}>Prediction</GroupHeader>
            <Group>
              <div className="px-4 py-3.5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  {prediction ? (
                    <p className="font-display text-title font-bold tracking-[-0.01em] leading-none tnum">
                      <CountUp value={prediction.score} /><span className="text-body text-label-2 font-medium"> / {prediction.total}</span>
                      {prediction.rough && <Tag tone="orange" className="ml-2 align-middle">rough</Tag>}
                    </p>
                  ) : (
                    <p className="text-body text-label-2">{PREDICTION_MIN - total} more answers unlock a prediction.</p>
                  )}
                  <p className="mt-1 text-footnote text-label-2 whitespace-nowrap">Predicted score</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-title font-bold tracking-[-0.01em] leading-none tnum">{weekAcc === null ? "—" : <CountUp value={weekAcc} suffix="%" />}</p>
                  <p className="mt-1 text-footnote text-label-2 whitespace-nowrap">Last 7 days</p>
                </div>
              </div>
              <div className="px-4 pb-4">
                <Trend data={trend} />
              </div>
            </Group>
            <GroupFooter>Predictions are labeled rough until 100 answers.</GroupFooter>
          </div>
        </div>
      )}
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
            <div className={`w-full rounded-[2px] origin-bottom ${d.total ? "bg-accent animate-[grow-y_600ms_var(--ease-out)_both]" : "bg-fill"}`} style={{ height: d.total ? `${pct}%` : "3px" }} />
          </div>
        );
      })}
    </div>
  );
}
