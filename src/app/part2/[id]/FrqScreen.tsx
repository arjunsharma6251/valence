"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Md } from "@/components/Md";
import { Button, Group, GroupFooter, GroupHeader, LargeTitle, Skeleton, Tag } from "@/components/ui";
import { IconBack } from "@/components/icons";
import type { FrqProblem } from "@/lib/content/types";
import { addFrqSubmission, saveFrqDraft } from "@/lib/store/actions";
import { useHydrated, useStore } from "@/lib/store";
import type { FrqSubmission } from "@/lib/store/state";
import { track } from "@/lib/analytics";

const SYMBOLS = ["→", "⇌", "Δ", "°", "⁺", "⁻", "²", "³", "₂", "₃", "₄", "×10^", "λ", "μ", "π"];

type Status =
  | { kind: "idle" }
  | { kind: "grading"; startedAt: number }
  | { kind: "error"; message: string; retryable: boolean }
  | { kind: "graded"; sub: FrqSubmission; cached: boolean };

/**
 * Part II: one textarea per sub-part inside its own group, drafts saved
 * locally as you type, grading via /api/grade with progress and estimate.
 * A failed grade never loses the typed answer; the model answer shows
 * after any attempt.
 */
export function FrqScreen({ problem }: { problem: FrqProblem }) {
  const hydrated = useHydrated();
  const anonId = useStore((s) => s.anon_id);
  const draft = useStore((s) => s.frq_drafts[problem.id]);
  const allSubmissions = useStore((s) => s.frq_submissions);
  const history = useMemo(() => allSubmissions.filter((x) => x.frq_id === problem.id), [allSubmissions, problem.id]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [showKey, setShowKey] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const focused = useRef<HTMLTextAreaElement | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!hydrated || loaded.current) return;
    setAnswers(draft ?? {});
    loaded.current = true;
  }, [hydrated, draft]);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => saveFrqDraft(problem.id, answers), 400);
    return () => clearTimeout(t);
  }, [answers, problem.id]);

  useEffect(() => {
    if (status.kind !== "grading") return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - status.startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [status]);

  const insert = (sym: string) => {
    const el = focused.current;
    if (!el) return;
    const label = el.dataset.label!;
    const v = answers[label] ?? "";
    const start = el.selectionStart ?? v.length;
    const end = el.selectionEnd ?? v.length;
    setAnswers((a) => ({ ...a, [label]: v.slice(0, start) + sym + v.slice(end) }));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + sym.length, start + sym.length); });
  };

  const grade = async () => {
    setStatus({ kind: "grading", startedAt: Date.now() });
    setElapsed(0);
    try {
      const res = await fetch("/api/grade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ frq_id: problem.id, answers, anon_id: anonId }) });
      const data = await res.json();
      if (!data.ok) {
        track("frq_grade_failed", { frq_id: problem.id, reason: data.reason ?? "unknown" });
        setStatus({ kind: "error", message: data.message ?? "Grading failed.", retryable: !["daily_cap", "paused", "not_configured"].includes(data.reason) });
        setShowKey(true);
        return;
      }
      const sub: FrqSubmission = { id: crypto.randomUUID(), frq_id: problem.id, answers, grade: data.grade, model: data.model, created_at: new Date().toISOString() };
      addFrqSubmission(sub);
      track("frq_submitted", { frq_id: problem.id, score: data.grade.total, max: data.grade.max_total, cached: Boolean(data.cached) });
      setStatus({ kind: "graded", sub, cached: Boolean(data.cached) });
      setShowKey(true);
    } catch {
      track("frq_grade_failed", { frq_id: problem.id, reason: "network" });
      setStatus({ kind: "error", message: "Couldn't reach the grader. Your answer is saved here; retry when you're back online.", retryable: true });
    }
  };

  if (!hydrated) return <div className="space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
  const total = problem.parts.reduce((s, p) => s + p.max_points, 0);
  const graded = status.kind === "graded" ? status.sub.grade : null;

  return (
    <div className="pb-28 mx-auto w-full max-w-[760px]">
      <Link href="/part2" className="inline-flex items-center gap-0.5 text-accent text-body min-h-[44px] -ml-2 pr-2"><IconBack size={20} /> Part II</Link>
      <LargeTitle className="pb-1">{problem.title}</LargeTitle>
      <p className="text-footnote text-label-2 pb-3">{problem.year} · Problem {problem.number} · {total} points · {graded ? <Tag tone="accent">AI-graded {graded.total}/{graded.max_total}</Tag> : "Saved on this device as you type"}</p>
      {problem.intro_md && <Group><div className="px-4 py-3"><Md text={problem.intro_md} className="text-body leading-relaxed" /></div></Group>}

      {problem.parts.map((p, i) => {
        const g = graded?.parts.find((x) => x.label === p.label);
        return (
          <div key={p.label}>
            <GroupHeader caps={false} trailing={g ? <span className={`tnum font-semibold ${g.points === g.max_points ? "text-green" : "text-label"}`}>{g.points} / {g.max_points}</span> : `${p.max_points} pt`}><span className="font-semibold text-label">Part {p.label}</span></GroupHeader>
            <Group>
              <div className="px-4 py-3"><Md text={p.stem_md} className="text-body leading-relaxed" /></div>
              <div className="px-4 py-3">
                <label className="sr-only" htmlFor={`ans-${p.label}`}>Answer to part {p.label}</label>
                <textarea
                  id={`ans-${p.label}`}
                  data-label={p.label}
                  value={answers[p.label] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [p.label]: e.target.value }))}
                  onFocus={(e) => (focused.current = e.currentTarget)}
                  rows={i === 0 ? 4 : 3}
                  placeholder="Plain text is fine: H2O, 2.5 x 10^-3, NaOH + HCl -> NaCl + H2O"
                  className="w-full rounded-[10px] bg-fill/70 px-3 py-2.5 text-body leading-relaxed min-h-24 resize-y focus:bg-group focus:ring-2 focus:ring-accent outline-none transition-colors"
                  disabled={status.kind === "grading"}
                />
              </div>
              {g && (
                <div className={`px-4 py-3 text-subhead leading-relaxed animate-rise ${g.points === g.max_points ? "text-green" : ""}`}>
                  {g.missing ? <p>{g.missing}</p> : <p>Full credit.</p>}
                  {g.common_mistakes && <p className="mt-1 text-label-2">{g.common_mistakes}</p>}
                </div>
              )}
              {showKey && (
                <details className="px-4 py-2 text-subhead" open={Boolean(g && g.points < g.max_points)}>
                  <summary className="cursor-pointer text-accent min-h-[36px] inline-flex items-center">Model answer and rubric</summary>
                  <Md text={p.key_md} className="mt-1 leading-relaxed" />
                  <ul className="mt-2 text-footnote text-label-2 space-y-0.5">
                    {p.rubric.map((r, j) => <li key={j}>{r.points} pt — {r.criterion}</li>)}
                  </ul>
                </details>
              )}
            </Group>
          </div>
        );
      })}

      {graded?.overall_feedback && <GroupFooter>{graded.overall_feedback}</GroupFooter>}

      {history.length > 0 && (
        <>
          <GroupHeader>Your submissions</GroupHeader>
          <Group>
            {[...history].reverse().map((h) => (
              <div key={h.id} className="px-4 min-h-[44px] flex items-center gap-3 text-subhead">
                <span className="text-label-2">{new Date(h.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                <span className="ml-auto font-semibold tnum">{h.grade ? `${h.grade.total}/${h.grade.max_total}` : "—"}</span>
              </div>
            ))}
          </Group>
        </>
      )}

      <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] md:bottom-0 inset-x-0 z-20 bg-ground/92 backdrop-blur-xl border-t border-sep shadow-bar">
        <div className="mx-auto max-w-[760px] px-4 py-2.5 space-y-2">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Insert symbol">
            {SYMBOLS.map((s) => (
              <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(s)} className="shrink-0 min-h-[36px] min-w-[36px] px-2 rounded-[8px] bg-fill text-subhead hover:bg-fill-2 active:bg-fill-2">{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {status.kind === "grading" ? (
              <p className="flex-1 text-subhead text-label-2 tnum" aria-live="polite">Grading… {elapsed}s <span className="text-label-3">(usually 5–15 s)</span></p>
            ) : status.kind === "error" ? (
              <p className="flex-1 text-footnote text-red" role="alert">{status.message}</p>
            ) : graded ? (
              <p className="flex-1 text-body"><span className="font-semibold tnum">{graded.total} / {graded.max_total}</span> <span className="text-label-2 text-footnote">AI-graded{status.kind === "graded" && status.cached ? ", cached" : ""}</span></p>
            ) : (
              <p className="flex-1 text-footnote text-label-2">Answers save as you type.</p>
            )}
            <Button size="compact" onClick={grade} disabled={status.kind === "grading" || (status.kind === "error" && !status.retryable)}>
              {status.kind === "error" && status.retryable ? "Retry" : graded ? "Grade again" : "Grade"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
