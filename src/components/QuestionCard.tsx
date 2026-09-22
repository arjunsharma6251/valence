"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Md } from "./Md";
import { Button, Pill } from "./ui";
import { getExplanation, getTopic } from "@/lib/content";
import type { OptionLabel, Question } from "@/lib/content/types";
import { addFlag, recordAttempt } from "@/lib/store/actions";
import { useStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import type { Attempt } from "@/lib/mastery";

const LABELS: OptionLabel[] = ["A", "B", "C", "D"];
const FLAG_REASONS: { value: "wrong_answer" | "unclear" | "typo" | "other"; label: string }[] = [
  { value: "wrong_answer", label: "Answer looks wrong" },
  { value: "unclear", label: "Unclear" },
  { value: "typo", label: "Typo / rendering" },
  { value: "other", label: "Other" },
];

export interface QuestionCardProps {
  question: Question;
  /** practice/review: instant feedback + explanation. mock: select only. detail: show everything. */
  mode: "practice" | "review" | "mock" | "detail";
  /** Pre-selected answer (mock resume, detail view). */
  selected?: OptionLabel | null;
  /** Called after an answer is chosen. In mock mode no attempt is recorded. */
  onAnswer?: (label: OptionLabel, attempt: Attempt | null) => void;
  /** Called on Enter / Next. */
  onNext?: () => void;
  nextLabel?: string;
  /** Position text like "3 of 10". */
  position?: string;
}

/**
 * One question per screen. Tap or press 1–4 to answer, Enter to advance,
 * E to toggle the explanation, F to flag. All feedback is inline: no modals.
 */
export function QuestionCard({ question, mode, selected = null, onAnswer, onNext, nextLabel = "Next", position }: QuestionCardProps) {
  const [chosen, setChosen] = useState<OptionLabel | null>(selected);
  const [showExpl, setShowExpl] = useState(mode === "detail");
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const startedAt = useRef<number>(0);
  const anonId = useStore((s) => s.anon_id);
  const topic = getTopic(question.topic_id);
  const explanation = getExplanation(question.id);
  const answered = chosen !== null;
  const revealed = mode === "detail" || (answered && mode !== "mock");
  const correct = chosen === question.correct_option;

  // Callers pass key={question.id}, so a new question mounts a fresh card.
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const choose = useCallback(
    (label: OptionLabel) => {
      if (mode === "detail") {
        setChosen(label);
        return;
      }
      if (mode !== "mock" && answered) return;
      setChosen(label);
      let attempt: Attempt | null = null;
      if (mode !== "mock") {
        attempt = recordAttempt({ question_id: question.id, chosen: label, ms_taken: Date.now() - startedAt.current, context: mode });
        track("question_answered", { question_id: question.id, topic: question.topic_id, correct: label === question.correct_option, context: mode, ms: Date.now() - startedAt.current });
        setShowExpl(true);
      }
      onAnswer?.(label, attempt);
    },
    [mode, answered, question, onAnswer],
  );

  const flag = useCallback(
    (reason: (typeof FLAG_REASONS)[number]["value"]) => {
      const f = addFlag({ question_id: question.id, reason, note: "" });
      setFlagged(true);
      setFlagOpen(false);
      track("explanation_flagged", { question_id: question.id, reason });
      void fetch("/api/flags", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, anon_id: anonId }), keepalive: true }).catch(() => {});
    },
    [question.id, anonId],
  );

  // Keyboard: 1–4 answer, Enter next, E explanation, F flag.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        choose(LABELS[Number(e.key) - 1]);
      } else if (e.key === "Enter" && onNext && (answered || mode === "mock" || mode === "detail")) {
        e.preventDefault();
        onNext();
      } else if ((e.key === "e" || e.key === "E") && revealed) {
        e.preventDefault();
        setShowExpl((v) => !v);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setFlagOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [choose, onNext, answered, mode, revealed]);

  return (
    <article className="animate-rise" aria-live="polite">
      <header className="flex items-center gap-2 text-xs text-faint mb-3 min-h-6">
        {position && <span className="font-medium text-muted">{position}</span>}
        {topic && (
          <Pill tone="neutral">{topic.name}</Pill>
        )}
        <span className="ml-auto truncate">{question.level === "local" ? "Local" : "National"} · {question.year}</span>
      </header>

      <div className="text-[17px] leading-relaxed">
        <Md text={question.stem_md} />
        {question.figure_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.figure_url} alt="Figure for this question" className="figure-invert mt-3 rounded-xl max-w-full bg-white" loading="lazy" />
        )}
      </div>

      <ol className="mt-5 space-y-2">
        {question.options.map((o, i) => {
          const isChosen = chosen === o.label;
          const isCorrect = o.label === question.correct_option;
          let tone = "border-line bg-elev hover:border-line-strong";
          if (revealed && isCorrect) tone = "border-ok bg-ok-wash";
          else if (revealed && isChosen && !isCorrect) tone = "border-bad bg-bad-wash";
          else if (isChosen) tone = "border-accent bg-accent-wash";
          return (
            <li key={o.label}>
              <button
                type="button"
                onClick={() => choose(o.label)}
                disabled={mode !== "mock" && mode !== "detail" && answered}
                aria-pressed={isChosen}
                className={`w-full text-left flex items-start gap-3 rounded-2xl border px-4 py-3 min-h-14 transition-colors duration-150 active:scale-[0.995] disabled:cursor-default ${tone}`}
              >
                <span className="mt-0.5 shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-line-strong text-xs font-semibold text-muted">
                  {o.label}
                </span>
                <span className="flex-1 text-[16px] leading-relaxed"><Md text={o.text_md} /></span>
                <kbd className="hidden sm:inline text-[11px] text-faint mt-1">{i + 1}</kbd>
              </button>
            </li>
          );
        })}
      </ol>

      {revealed && mode !== "detail" && (
        <p className={`mt-4 text-[15px] font-medium animate-pop ${correct ? "text-ok" : "text-bad"}`}>
          {correct ? "Correct." : `Not quite — the answer is ${question.correct_option}.`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {revealed && (
          <Button variant="secondary" onClick={() => { setShowExpl((v) => !v); if (!showExpl) track("explanation_expanded", { question_id: question.id }); }} aria-expanded={showExpl}>
            {showExpl ? "Hide explanation" : "Explanation"} <kbd className="hidden sm:inline text-[11px] text-faint">E</kbd>
          </Button>
        )}
        <Button variant="ghost" onClick={() => setFlagOpen((v) => !v)} aria-expanded={flagOpen} className="px-3">
          {flagged ? "Flagged ✓" : "Flag"} <kbd className="hidden sm:inline text-[11px] text-faint">F</kbd>
        </Button>
        {onNext && (answered || mode === "mock" || mode === "detail") && (
          <Button onClick={onNext} className="ml-auto">
            {nextLabel} <kbd className="hidden sm:inline text-[11px] opacity-70">↵</kbd>
          </Button>
        )}
      </div>

      {flagOpen && (
        <div className="mt-3 flex flex-wrap gap-2 animate-pop" role="group" aria-label="Flag reason">
          {FLAG_REASONS.map((r) => (
            <Button key={r.value} variant="secondary" className="min-h-10 px-4 text-[14px]" onClick={() => flag(r.value)}>
              {r.label}
            </Button>
          ))}
        </div>
      )}

      {revealed && showExpl && (
        <section className="mt-5 rounded-2xl border border-line bg-elev p-5 space-y-4 animate-rise">
          {question.acs_solution_md && (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-faint mb-1">Official solution</p>
              <Md text={question.acs_solution_md} className="text-[15px] leading-relaxed" />
            </div>
          )}
          {explanation ? (
            <>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-faint mb-1 flex items-center gap-2">
                  Step by step {!explanation.verified && <Pill tone="neutral">draft</Pill>}
                </p>
                <Md text={explanation.body_md} className="text-[15px] leading-relaxed" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-faint mb-1">Each option</p>
                <ul className="space-y-1.5 text-[14px] leading-relaxed">
                  {LABELS.map((l) => (
                    <li key={l} className={`flex gap-2 ${l === question.correct_option ? "text-ok" : chosen === l ? "text-bad" : "text-muted"}`}>
                      <span className="font-semibold w-4 shrink-0">{l}</span>
                      <Md text={explanation.distractor_notes[l]} />
                    </li>
                  ))}
                </ul>
              </div>
              {explanation.concept_ref && (
                <p className="text-[13px] text-muted">
                  Concept: <Link href={`/search?q=${encodeURIComponent(explanation.concept_ref)}`} className="text-accent underline-offset-2 hover:underline">{explanation.concept_ref}</Link>
                </p>
              )}
            </>
          ) : (
            <p className="text-[14px] text-muted">No explanation yet for this question.</p>
          )}
          <p className="text-[12px] text-faint flex flex-wrap gap-x-3">
            <span>{question.source}</span>
            {mode !== "detail" && <Link href={`/q/${question.id}`} className="hover:text-fg">Open question page</Link>}
          </p>
        </section>
      )}
    </article>
  );
}
