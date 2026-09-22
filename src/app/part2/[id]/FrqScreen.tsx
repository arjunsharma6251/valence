"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Md } from "@/components/Md";
import { Button, Card, Eyebrow, Pill, Skeleton } from "@/components/ui";
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
 * Part II: one textarea per sub-part, drafts saved locally as you type,
 * grading via /api/grade with progress and a time estimate. A failed grade
 * never loses the typed answer, and the model answer shows after any attempt.
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

  // Save drafts (debounced) so nothing typed is ever lost.
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
    const next = v.slice(0, start) + sym + v.slice(end);
    setAnswers((a) => ({ ...a, [label]: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    });
  };

  const grade = async () => {
    setStatus({ kind: "grading", startedAt: Date.now() });
    setElapsed(0);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ frq_id: problem.id, answers, anon_id: anonId }),
      });
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

  if (!hydrated) return <Skeleton className="h-80" />;
  const total = problem.parts.reduce((s, p) => s + p.max_points, 0);
  const graded = status.kind === "graded" ? status.sub.grade : null;

  return (
    <div className="space-y-5">
      <header className="animate-rise">
        <Eyebrow>{problem.year} · Problem {problem.number} · {total} points</Eyebrow>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight">{problem.title}</h1>
        {problem.intro_md && <Md text={problem.intro_md} className="mt-3 text-[16px] leading-relaxed" />}
      </header>

      {problem.parts.map((p, i) => {
        const g = graded?.parts.find((x) => x.label === p.label);
        return (
          <Card key={p.label} className="animate-rise">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold">({p.label})</span>
              <span className="ml-auto text-[13px] text-faint">{p.max_points} pt</span>
            </div>
            <Md text={p.stem_md} className="mt-1 text-[16px] leading-relaxed" />
            <label className="sr-only" htmlFor={`ans-${p.label}`}>Answer to part {p.label}</label>
            <textarea
              id={`ans-${p.label}`}
              data-label={p.label}
              value={answers[p.label] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [p.label]: e.target.value }))}
              onFocus={(e) => (focused.current = e.currentTarget)}
              rows={i === 0 ? 4 : 3}
              placeholder="Type your answer. Plain text is fine: H2O, 2.5 x 10^-3, NaOH + HCl -> NaCl + H2O"
              className="mt-3 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-[15px] leading-relaxed placeholder:text-faint focus:border-accent min-h-24"
              disabled={status.kind === "grading"}
            />
            {g && (
              <div className={`mt-3 rounded-xl p-3 text-[14px] leading-relaxed animate-pop ${g.points === g.max_points ? "bg-ok-wash" : "bg-accent-wash"}`}>
                <p className="font-semibold">{g.points} / {g.max_points}</p>
                {g.missing && <p className="mt-1">{g.missing}</p>}
                {g.common_mistakes && <p className="mt-1 text-muted">{g.common_mistakes}</p>}
              </div>
            )}
            {showKey && (
              <details className="mt-3 text-[14px]" open={Boolean(g && g.points < g.max_points)}>
                <summary className="cursor-pointer text-muted min-h-9 inline-flex items-center">Model answer</summary>
                <Md text={p.key_md} className="mt-1 leading-relaxed" />
                <ul className="mt-2 text-[13px] text-faint space-y-0.5">
                  {p.rubric.map((r, j) => <li key={j}>{r.points} pt — {r.criterion}</li>)}
                </ul>
              </details>
            )}
          </Card>
        );
      })}

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-bg/90 backdrop-blur border-t border-line space-y-2">
        <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Insert symbol">
          {SYMBOLS.map((s) => (
            <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(s)} className="shrink-0 min-h-9 min-w-9 px-2 rounded-lg border border-line bg-elev text-[14px] hover:bg-accent-wash">{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {status.kind === "grading" ? (
            <p className="flex-1 text-[14px] text-muted" aria-live="polite">Grading… {elapsed}s <span className="text-faint">(usually 5–15 s)</span></p>
          ) : status.kind === "error" ? (
            <p className="flex-1 text-[14px] text-bad" role="alert">{status.message}</p>
          ) : graded ? (
            <p className="flex-1 text-[15px]"><span className="font-semibold">{graded.total} / {graded.max_total}</span> <Pill tone="neutral" className="ml-1">AI-graded{status.kind === "graded" && status.cached ? " · cached" : ""}</Pill></p>
          ) : (
            <p className="flex-1 text-[13px] text-faint">Saved on this device as you type.</p>
          )}
          <Button onClick={grade} disabled={status.kind === "grading" || (status.kind === "error" && !status.retryable)}>
            {status.kind === "error" && status.retryable ? "Retry" : graded ? "Grade again" : "Grade"}
          </Button>
        </div>
        {graded?.overall_feedback && <p className="text-[14px] text-muted leading-relaxed">{graded.overall_feedback}</p>}
      </div>

      {history.length > 0 && (
        <Card>
          <Eyebrow>Your submissions</Eyebrow>
          <ul className="mt-2 divide-y divide-line text-[14px]">
            {[...history].reverse().map((h) => (
              <li key={h.id} className="py-2 flex gap-3">
                <span className="text-faint">{new Date(h.created_at).toLocaleString()}</span>
                <span className="ml-auto font-medium">{h.grade ? `${h.grade.total}/${h.grade.max_total}` : "—"}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
