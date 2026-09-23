"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Md } from "./Md";
import { Button, Group, GroupHeader, Kbd, Tag } from "./ui";
import { IconCheck, IconFlag, IconShare, IconX } from "./icons";
import { getExplanation, getTopic } from "@/lib/content";
import type { OptionLabel, Question } from "@/lib/content/types";
import { addFlag, recordAttempt } from "@/lib/store/actions";
import { useStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import { shareLink } from "@/lib/share";
import type { Attempt } from "@/lib/mastery";

/** Attempts faster than this are not recorded (see `choose`). */
const MIN_ATTEMPT_MS = 500;

const LABELS: OptionLabel[] = ["A", "B", "C", "D"];
const FLAG_REASONS: { value: "wrong_answer" | "unclear" | "typo" | "other"; label: string }[] = [
  { value: "wrong_answer", label: "Answer looks wrong" },
  { value: "unclear", label: "Unclear" },
  { value: "typo", label: "Typo or rendering" },
  { value: "other", label: "Something else" },
];

export interface QuestionCardProps {
  question: Question;
  mode: "practice" | "review" | "mock" | "detail";
  selected?: OptionLabel | null;
  onAnswer?: (label: OptionLabel, attempt: Attempt | null) => void;
  onNext?: () => void;
  nextLabel?: string;
  position?: string;
}

/**
 * One question per screen. The stem sits on the ground as content; the
 * options are a grouped list. Feedback is the row filling green or red
 * with a glyph springing in, then the explanation group rises below.
 * Keys: 1–4 answer, Enter next, E explanation, F flag. No modals.
 */
export function QuestionCard({ question, mode, selected = null, onAnswer, onNext, nextLabel = "Next", position }: QuestionCardProps) {
  const [chosen, setChosen] = useState<OptionLabel | null>(selected);
  const [showExpl, setShowExpl] = useState(mode === "detail");
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [shared, setShared] = useState<"idle" | "copied" | "shared">("idle");
  const startedAt = useRef<number>(0);
  const anonId = useStore((s) => s.anon_id);
  const topic = getTopic(question.topic_id);
  const explanation = getExplanation(question.id);
  const answered = chosen !== null;
  const revealed = mode === "detail" || (answered && mode !== "mock");
  const correct = chosen === question.correct_option;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const choose = useCallback(
    (label: OptionLabel) => {
      if (mode === "detail") { setChosen(label); return; }
      if (mode !== "mock" && answered) return;
      setChosen(label);
      let attempt: Attempt | null = null;
      if (mode !== "mock") {
        const ms = Date.now() - startedAt.current;
        // Faster than reading the stem is key-mashing, not an answer: reveal it,
        // but keep it out of mastery, the review queue, sync and the leaderboard.
        const counted = ms >= MIN_ATTEMPT_MS;
        if (counted) attempt = recordAttempt({ question_id: question.id, chosen: label, ms_taken: ms, context: mode });
        track("question_answered", { question_id: question.id, topic: question.topic_id, correct: label === question.correct_option, context: mode, ms, counted });
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["1", "2", "3", "4"].includes(e.key)) { e.preventDefault(); choose(LABELS[Number(e.key) - 1]); }
      else if (e.key === "Enter" && onNext && (answered || mode === "mock" || mode === "detail")) { e.preventDefault(); onNext(); }
      else if ((e.key === "e" || e.key === "E") && revealed) { e.preventDefault(); setShowExpl((v) => !v); }
      else if (e.key === "f" || e.key === "F") { e.preventDefault(); setFlagOpen((v) => !v); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [choose, onNext, answered, mode, revealed]);

  const canAdvance = Boolean(onNext) && (answered || mode === "mock" || mode === "detail");

  const share = async () => {
    const r = await shareLink({
      title: "Can you get this USNCO question?",
      text: `${topic?.name ?? "Chemistry"} question on Valence. Can you get it?`,
      url: `/q/${question.id}?c=1`,
      kind: "challenge",
    });
    if (r === "copied" || r === "shared") {
      setShared(r);
      setTimeout(() => setShared("idle"), 2200);
    }
  };

  return (
    <article aria-live="polite" className={`animate-rise ${mode === "mock" ? "" : "lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-8"}`}>
      <div className="lg:col-start-1">
      <div className="flex items-center gap-3 mono min-h-6 mb-4 whitespace-nowrap">
        {position && <span className="text-ink tnum shrink-0">{position}</span>}
        {topic && <span className="truncate min-w-0">{topic.name}</span>}
        <span className="ml-auto shrink-0">{question.level === "local" ? "Local" : "National"} {question.year}</span>
      </div>

      <div className="text-[17px] leading-relaxed">
        <Md text={question.stem_md} className="lg:text-[19px]" />
        {question.figure_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.figure_url} alt="Figure for this question" className="figure-invert mt-3 rounded-[4px] max-w-full" loading="lazy" />
        )}
      </div>

      <Group className="mt-6 stagger">
        {question.options.map((o, i) => {
          const isChosen = chosen === o.label;
          const isCorrect = o.label === question.correct_option;
          const showCorrect = revealed && isCorrect;
          const showWrong = revealed && isChosen && !isCorrect;
          const dim = revealed && !isCorrect && !isChosen ? "opacity-60" : "";
          const tone = showCorrect ? "bg-green-wash" : showWrong ? "bg-red-wash" : isChosen ? "bg-accent-wash" : "hover:bg-canvas-2";
          const badge = showCorrect
            ? "bg-green text-canvas border-green"
            : showWrong
              ? "bg-red text-canvas border-red"
              : isChosen
                ? "bg-ink text-canvas border-ink"
                : "border-line-strong text-ink-soft";
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => choose(o.label)}
              disabled={mode !== "mock" && mode !== "detail" && answered}
              aria-pressed={isChosen}
              className={`text-left flex items-start gap-4 px-3 -mx-3 w-[calc(100%+24px)] py-3 min-h-[52px] rounded-[4px] transition-[background-color,opacity,transform] duration-200 active:scale-[0.995] disabled:cursor-default ${tone} ${dim}`}
            >
              <span className={`mt-0.5 shrink-0 w-7 h-7 rounded-[3px] border inline-flex items-center justify-center font-mono text-[12px] transition-[background-color,border-color] duration-150 ${badge}`}>
                {showCorrect ? <IconCheck size={16} className="animate-spring" /> : showWrong ? <IconX size={16} className="animate-spring" /> : o.label}
              </span>
              <span className="flex-1 text-[16px] leading-relaxed pt-0.5"><Md text={o.text_md} /></span>
              <Kbd>{i + 1}</Kbd>
            </button>
          );
        })}
      </Group>

      {revealed && mode !== "detail" && (
        <p className={`mt-4 text-[15px] font-medium animate-rise ${correct ? "text-green" : "text-red"}`}>
          {correct ? "Correct" : `Not quite. The answer is ${question.correct_option}.`}
        </p>
      )}
      {revealed && question.field_percent_correct != null && (
        <p className="mt-2 text-[13px] text-ink-soft animate-rise [animation-delay:80ms]">
          <span className="tnum">{Math.round(question.field_percent_correct * 100)}%</span> of national qualifiers got this right
          {mode !== "detail" && (correct ? (question.field_percent_correct < 0.4 ? ", so this one is hard. Nice." : ".") : (question.field_percent_correct >= 0.75 ? ", so it is worth a second look." : "."))}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {revealed && (
          <Button variant="outline" size="compact" onClick={() => { setShowExpl((v) => !v); if (!showExpl) track("explanation_expanded", { question_id: question.id }); }} aria-expanded={showExpl}>
            {showExpl ? "Hide" : "Explanation"} <Kbd>E</Kbd>
          </Button>
        )}
        <Button variant="plain" size="compact" onClick={() => setFlagOpen((v) => !v)} aria-expanded={flagOpen} aria-label={flagged ? "Flagged" : "Flag this question"}>
          <IconFlag size={18} /> {flagged ? "Flagged" : "Flag"} <Kbd>F</Kbd>
        </Button>
        {revealed && (
          <Button variant="plain" size="compact" onClick={share} aria-label="Challenge a friend with this question" className="px-3">
            <IconShare size={18} /> <span className="hidden sm:inline">{shared === "copied" ? "Link copied" : shared === "shared" ? "Sent" : "Challenge"}</span>
          </Button>
        )}
        {canAdvance && (
          <Button onClick={onNext} size="compact" className="ml-auto">
            {nextLabel} <Kbd onAccent>↵</Kbd>
          </Button>
        )}
      </div>

      </div>

      {flagOpen && (
        <Group className="mt-3 animate-rise lg:col-start-1" aria-label="Flag reason">
          {FLAG_REASONS.map((r) => (
            <button key={r.value} type="button" onClick={() => flag(r.value)} className="w-full text-left min-h-[44px] text-[15px] hover:text-accent">
              {r.label}
            </button>
          ))}
        </Group>
      )}

      {revealed && showExpl && (
        <div className="animate-rise lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-[88px] lg:self-start lg:border-l lg:border-line lg:pl-10 lg:[&>div:first-child]:pt-0">
          {question.acs_solution_md && (
            <>
              <GroupHeader>Official solution</GroupHeader>
              <Group><div className="py-3"><Md text={question.acs_solution_md} className="text-[15px] leading-relaxed" /></div></Group>
            </>
          )}
          <GroupHeader trailing={explanation && !explanation.verified ? <Tag tone="neutral">draft</Tag> : undefined}>Explanation</GroupHeader>
          <Group>
            {explanation ? (
              <>
                <div className="py-3"><Md text={explanation.body_md} className="text-[15px] leading-relaxed" /></div>
                {LABELS.map((l) => (
                  <div key={l} className={`px-4 py-2.5 flex gap-3 text-[15px] leading-relaxed ${l === question.correct_option ? "text-green" : chosen === l ? "text-red" : "text-ink-soft"}`}>
                    <span className="font-mono text-[12px] w-4 shrink-0 pt-0.5">{l}</span>
                    <Md text={explanation.distractor_notes[l]} />
                  </div>
                ))}
                {explanation.concept_ref && (
                  <Link href={`/search?q=${encodeURIComponent(explanation.concept_ref)}`} className="block min-h-[44px] py-2.5 text-[14px] text-ink-soft hover:text-accent">
                    Concept · {explanation.concept_ref}
                  </Link>
                )}
              </>
            ) : (
              <div className="py-3 text-[14px] text-ink-soft">No explanation yet.</div>
            )}
          </Group>
          <p className="pt-3 mono normal-case flex flex-wrap gap-x-4">
            <span>{question.source}</span>
            {mode !== "detail" && <Link href={`/q/${question.id}`} className="hover:text-ink">Open page</Link>}
          </p>
        </div>
      )}
    </article>
  );
}
