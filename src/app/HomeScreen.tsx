"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Card, Eyebrow, LinkButton, Pill, Skeleton } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getTopic, questions, topics } from "@/lib/content";
import { accuracyByDay } from "@/lib/mastery";
import { PREDICTION_MIN } from "@/lib/predict";
import { useHydrated, useStore } from "@/lib/store";
import { useDueCards, usePrediction, useSkills, useWeakTopics } from "@/lib/store/derived";

/**
 * Home: where am I, what's due. Progress lives here, not on a separate tab.
 * New users see a three-step explanation instead of empty charts.
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

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const total = attempts.length;
  const recentAcc = (() => {
    const last = trend.slice(-7).reduce((s, d) => ({ t: s.t + d.total, c: s.c + d.correct }), { t: 0, c: 0 });
    return last.t ? Math.round((100 * last.c) / last.t) : null;
  })();

  return (
    <div className="space-y-5">
      <header className="animate-rise">
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Practice for the USNCO.</h1>
        <p className="mt-1.5 text-[15px] text-muted">Adaptive questions, real explanations, and graded Part II. Free, no account needed.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 animate-rise [animation-delay:60ms]">
        <LinkButton href="/practice" className="min-h-14 text-[16px]">Practice</LinkButton>
        <LinkButton href="/mock" variant="secondary" className="min-h-14 text-[16px]">{inProgress ? "Resume mock" : "Mock exam"}</LinkButton>
        <LinkButton href="/review" variant="secondary" className="min-h-14 text-[16px]">
          Review {due.length > 0 && <Pill tone="accent">{due.length} due</Pill>}
        </LinkButton>
        <LinkButton href="/part2" variant="secondary" className="min-h-14 text-[16px]">Part II</LinkButton>
      </div>

      {total === 0 ? (
        <Card className="animate-rise [animation-delay:120ms]">
          <Eyebrow>How this works</Eyebrow>
          <ol className="mt-3 space-y-3 text-[15px] leading-relaxed">
            <li className="flex gap-3"><span className="text-accent font-semibold">1</span><span><strong>Practice</strong> picks questions from all ten ACS topics and learns where you are weak. Answer with a tap or keys 1–4.</span></li>
            <li className="flex gap-3"><span className="text-accent font-semibold">2</span><span><strong>Review</strong> brings back what you missed on a spaced schedule so it sticks.</span></li>
            <li className="flex gap-3"><span className="text-accent font-semibold">3</span><span>After about {PREDICTION_MIN} questions, this screen shows your weakest topics and a rough predicted exam score. A <strong>mock</strong> checks it under time.</span></li>
          </ol>
          <p className="mt-4 text-[13px] text-faint">{questions.length} questions in the bank right now, growing through the season. Progress is saved on this device; sign in to keep it across devices.</p>
        </Card>
      ) : (
        <>
          <Card className="animate-rise [animation-delay:120ms]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow>Predicted {target === "local" ? "local exam" : "national Part I"} score</Eyebrow>
                {prediction ? (
                  <p className="mt-1 text-[34px] font-semibold tracking-tight leading-none">
                    {prediction.score}<span className="text-[18px] text-faint font-normal"> / {prediction.total}</span>
                    {prediction.rough && <Pill tone="neutral" className="ml-2 align-middle">rough</Pill>}
                  </p>
                ) : (
                  <p className="mt-1 text-[15px] text-muted">Answer {PREDICTION_MIN - total} more to unlock a prediction.</p>
                )}
              </div>
              <div className="text-right">
                <Eyebrow>Last 7 days</Eyebrow>
                <p className="mt-1 text-[22px] font-semibold tracking-tight leading-none">{recentAcc === null ? "—" : `${recentAcc}%`}</p>
                <p className="text-[12px] text-faint mt-1">{total} answered</p>
              </div>
            </div>
            <Trend data={trend} />
          </Card>

          <Card className="animate-rise [animation-delay:180ms]">
            <Eyebrow>Weakest topics</Eyebrow>
            <ul className="mt-3 divide-y divide-line">
              {weak.slice(0, 5).map((s) => {
                const t = getTopic(s.topic_id);
                const acc = s.attempts ? Math.round((100 * s.correct) / s.attempts) : null;
                return (
                  <li key={s.topic_id} className="py-2.5 flex items-center gap-3">
                    <Link href={`/practice?topic=${s.topic_id}`} className="flex-1 text-[15px] hover:text-accent">{t?.name ?? s.topic_id}</Link>
                    <span className="text-[13px] text-faint">{s.attempts ? `${s.attempts} tried` : "not yet tried"}</span>
                    <span className={`w-12 text-right text-[14px] font-medium ${acc === null ? "text-faint" : acc < 60 ? "text-bad" : "text-fg"}`}>{acc === null ? "—" : `${acc}%`}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[13px] text-faint">Ratings: {topics.map((t) => `${t.name.split(" ")[0]} ${Math.round(skills[t.id]?.rating ?? 1500)}`).join(" · ")}</p>
          </Card>
        </>
      )}

      <div className="flex items-center justify-between pt-2 animate-rise [animation-delay:240ms]">
        <ThemeToggle />
        <Link href="/signin" className="text-[13px] text-muted hover:text-fg min-h-11 inline-flex items-center">Account</Link>
      </div>
    </div>
  );
}

/** 30-day accuracy trend as a tiny bar chart; days without attempts stay empty. */
function Trend({ data }: { data: { day: string; total: number; correct: number }[] }) {
  return (
    <div className="mt-4 flex items-end gap-[3px] h-10" aria-label="Accuracy over the last 30 days">
      {data.map((d) => {
        const h = d.total ? Math.max(12, (100 * d.correct) / d.total) : 0;
        return (
          <div key={d.day} className="flex-1 flex items-end h-full" title={d.total ? `${d.day}: ${d.correct}/${d.total}` : d.day}>
            <div className={`w-full rounded-sm ${d.total ? "bg-accent" : "bg-line"}`} style={{ height: d.total ? `${h}%` : "2px", opacity: d.total ? 0.5 + d.total / 20 : 1 }} />
          </div>
        );
      })}
    </div>
  );
}
