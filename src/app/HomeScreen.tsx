"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Group, GroupHeader, Row, Skeleton, Tag } from "@/components/ui";
import { CountUp } from "@/components/CountUp";
import { Leaderboard } from "@/components/Leaderboard";
import { Welcome } from "@/components/Welcome";
import { SignInNudge } from "@/components/SignInNudge";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getTopic, questions } from "@/lib/content";
import { accuracyByDay } from "@/lib/mastery";
import { PREDICTION_MIN } from "@/lib/predict";
import { useHydrated, useStore } from "@/lib/store";
import { useDueCards, usePrediction, useSkills, useWeakTopics } from "@/lib/store/derived";

/** Home: four destinations, then what is weak and what is predicted. Nothing else. */
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
  const lastMock = [...mocks].reverse().find((m) => m.submitted_at);

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  if (!hydrated) return <div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-[220px]" /></div>;

  const total = attempts.length;
  const week = trend.slice(-7).reduce((s, d) => ({ t: s.t + d.total, c: s.c + d.correct }), { t: 0, c: 0 });
  const weekAcc = week.t ? Math.round((100 * week.c) / week.t) : null;

  const dest = [
    { href: "/practice", name: "Practice", status: total ? `${total} answered` : "Adaptive, all topics" },
    { href: "/mock", name: "Mock exam", status: inProgress ? "In progress" : lastMock?.score ? `Last ${lastMock.score.correct}/${lastMock.score.total}` : "60 questions, timed" },
    { href: "/review", name: "Review", status: due.length ? `${due.length} due` : "Nothing due" },
    { href: "/part2", name: "Part II", status: "Free response, graded" },
  ];

  return (
    <div>
      <Welcome />
      <SignInNudge context="prediction" show={Boolean(prediction)} />
      <ul className="stagger grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 md:gap-x-8">
        {dest.map((d, i) => (
          <li key={d.href} className="border-t border-line">
            <Link href={d.href} className="group block pt-4 min-h-[110px]">
              <span className="mono block">0{i + 1}</span>
              <span className="serif block mt-5 text-[26px] md:text-[30px] leading-none tracking-[-0.01em] group-hover:text-accent transition-[color] duration-150">{d.name}</span>
              <span className="block mt-2 text-[13px] text-ink-soft">{d.status}</span>
            </Link>
          </li>
        ))}
      </ul>

      {total === 0 ? (
        <p className="mt-14 max-w-[52ch] text-[15px] text-ink-soft leading-relaxed animate-rise [animation-delay:200ms]">
          Practice adapts to what you miss. Review brings it back on a schedule. After {PREDICTION_MIN} answers you get a predicted score. {questions.length} questions, no account needed.{" "}
          <Link href="/about" className="text-accent whitespace-nowrap">What Valence does →</Link>
        </p>
      ) : (
        <div className="stagger md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-x-16 md:items-start">
          <div>
            <GroupHeader trailing="Weakest first">Topics</GroupHeader>
            <Group>
              {weak.map((s) => {
                const t = getTopic(s.topic_id);
                const acc = s.attempts ? Math.round((100 * s.correct) / s.attempts) : null;
                const weakRow = acc !== null && acc < 60;
                return (
                  <Row key={s.topic_id} href={`/practice?topic=${s.topic_id}`} title={t?.name ?? s.topic_id}
                    detail={s.attempts ? `${s.attempts} answered · rating ${Math.round(skills[s.topic_id]?.rating ?? 1500)}` : "Not tried"}
                    value={<span className={weakRow ? "text-red" : ""}>{acc === null ? "—" : `${acc}%`}</span>}>
                    <span className="w-16 h-px bg-line shrink-0 relative" aria-hidden="true">
                      <span className={`grow absolute inset-y-[-1px] left-0 ${weakRow ? "bg-red" : "bg-ink"}`} style={{ width: `${acc ?? 0}%` }} />
                    </span>
                  </Row>
                );
              })}
            </Group>
          </div>
          <div>
            <GroupHeader trailing={target === "local" ? "Local exam" : "National Part I"}>Prediction</GroupHeader>
            <div className="border-t border-line pt-5 flex items-end justify-between gap-6">
              <div>
                {prediction ? (
                  <p className="serif text-[44px] leading-none tracking-[-0.02em] tnum"><CountUp value={prediction.score} /><span className="text-[20px] text-ink-soft"> / {prediction.total}</span>{prediction.rough && <Tag tone="orange" className="ml-3 align-middle">rough</Tag>}</p>
                ) : (
                  <p className="serif text-[26px] leading-tight text-ink-soft">{PREDICTION_MIN - total} more to unlock</p>
                )}
                <p className="mono mt-3">Predicted score</p>
              </div>
              <div className="text-right">
                <p className="serif text-[44px] leading-none tracking-[-0.02em] tnum">{weekAcc === null ? "—" : <CountUp value={weekAcc} suffix="%" />}</p>
                <p className="mono mt-3">Last 7 days</p>
              </div>
            </div>
            <Trend data={trend} />
            <div className="mt-12">
              <Leaderboard userId={userId} />
            </div>
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="md:max-w-[680px]">
          <Leaderboard userId={userId} />
        </div>
      )}
    </div>
  );
}

/** 30 days of accuracy as thin bars on a hairline. */
function Trend({ data }: { data: { day: string; total: number; correct: number }[] }) {
  return (
    <div className="mt-8 flex items-end gap-[3px] h-10 border-b border-line" role="img" aria-label="Accuracy over the last 30 days">
      {data.map((d) => {
        const pct = d.total ? Math.max(8, (100 * d.correct) / d.total) : 0;
        return (
          <div key={d.day} className="flex-1 flex items-end h-full" title={d.total ? `${d.day}: ${d.correct} of ${d.total}` : d.day}>
            <div className={`w-full origin-bottom ${d.total ? "bg-ink animate-[grow-y_600ms_var(--ease-out)_both]" : "bg-line"}`} style={{ height: d.total ? `${pct}%` : "2px" }} />
          </div>
        );
      })}
    </div>
  );
}
