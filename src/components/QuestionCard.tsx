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
        attempt = recordAttempt({ question_id: question.id, chosen: label, ms_taken: ms, context: mode });
        track("question_answered", { question_id: question.id, topic: question.topic_id, correct: label === question.correct_option, context: mode, ms });
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
      <div className="flex items-center gap-2 text-footnote text-label-2 min-h-6 mb-2 whitespace-nowrap">
        {position && <span className="font-semibold text-label tnum shrink-0">{position}</span>}
        {topic && <span className="truncate min-w-0">{topic.name}</span>}
        <span className="ml-auto shrink-0">{question.level === "local" ? "Local" : "National"} {question.year}</span>
      </div>

      <div className="text-body leading-relaxed">
        <Md text={question.stem_md} className="lg:text-[19px]" />
        {question.figure_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.figure_url} alt="Figure for this question" className="figure-invert mt-3 rounded-[10px] max-w-full" loading="lazy" />
        )}
      </div>

      <Group className="mt-4 stagger" insetIcon>
        {question.options.map((o, i) => {
          const isChosen = chosen === o.label;
          const isCorrect = o.label === question.correct_option;
          const showCorrect = revealed && isCorrect;
          const showWrong = revealed && isChosen && !isCorrect;
          const dim = revealed && !isCorrect && !isChosen ? "opacity-60" : "";
          const tone = showCorrect ? "bg-green-tint" : showWrong ? "bg-red-tint" : isChosen ? "bg-accent-tint" : "hover:bg-fill/60 active:bg-fill";
          const badge = showCorrect
            ? "bg-green text-white"
            : showWrong
              ? "bg-red text-white"
              : isChosen
                ? "bg-accent text-accent-on"
                : "border border-sep-strong text-label-2";
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => choose(o.label)}
              disabled={mode !== "mock" && mode !== "detail" && answered}
              aria-pressed={isChosen}
              className={`w-full text-left flex items-start gap-3 px-4 py-3 min-h-[52px] transition-[background-color,opacity,transform] duration-200 active:scale-[0.995] disabled:cursor-default ${tone} ${dim}`}
            >
              <span className={`mt-0.5 shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center text-footnote font-semibold transition-[background-color,border-color] duration-150 ${badge}`}>
                {showCorrect ? <IconCheck size={16} className="animate-spring" /> : showWrong ? <IconX size={16} className="animate-spring" /> : o.label}
              </span>
              <span className="flex-1 text-body leading-relaxed pt-0.5"><Md text={o.text_md} /></span>
              <Kbd>{i + 1}</Kbd>
            </button>
          );
        })}
      </Group>

      {revealed && mode !== "detail" && (
        <p className={`mt-3 px-1 text-body font-semibold animate-rise ${correct ? "text-green" : "text-red"}`}>
          {correct ? "Correct" : `Not quite. The answer is ${question.correct_option}.`}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {revealed && (
          <Button variant="tinted" size="compact" onClick={() => { setShowExpl((v) => !v); if (!showExpl) track("explanation_expanded", { question_id: question.id }); }} aria-expanded={showExpl}>
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
            <button key={r.value} type="button" onClick={() => flag(r.value)} className="w-full text-left px-4 min-h-[44px] text-body text-accent hover:bg-fill/60 active:bg-fill">
              {r.label}
            </button>
          ))}
        </Group>
      )}

      {revealed && showExpl && (
        <div className="animate-rise lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-[76px] lg:self-start lg:[&>div:first-child]:pt-0 lg:[&_h2]:pt-0">
          {question.acs_solution_md && (
            <>
              <GroupHeader>Official solution</GroupHeader>
              <Group><div className="px-4 py-3"><Md text={question.acs_solution_md} className="text-subhead leading-relaxed" /></div></Group>
            </>
          )}
          <GroupHeader trailing={explanation && !explanation.verified ? <Tag tone="neutral">draft</Tag> : undefined}>Explanation</GroupHeader>
          <Group>
            {explanation ? (
              <>
                <div className="px-4 py-3"><Md text={explanation.body_md} className="text-subhead leading-relaxed" /></div>
                {LABELS.map((l) => (
                  <div key={l} className={`px-4 py-2.5 flex gap-3 text-subhead leading-relaxed ${l === question.correct_option ? "text-green" : chosen === l ? "text-red" : "text-label-2"}`}>
                    <span className="font-semibold w-4 shrink-0 tnum">{l}</span>
                    <Md text={explanation.distractor_notes[l]} />
                  </div>
                ))}
                {explanation.concept_ref && (
                  <Link href={`/search?q=${encodeURIComponent(explanation.concept_ref)}`} className="block px-4 min-h-[44px] py-2.5 text-subhead text-accent hover:bg-fill/60">
                    Concept: {explanation.concept_ref}
                  </Link>
                )}
              </>
            ) : (
              <div className="px-4 py-3 text-subhead text-label-2">No explanation yet for this question.</div>
            )}
          </Group>
          <p className="px-4 pt-1.5 text-footnote text-label-2 flex flex-wrap gap-x-3">
            <span>{question.source}</span>
            {mode !== "detail" && <Link href={`/q/${question.id}`} className="text-accent">Open question page</Link>}
          </p>
        </div>
      )}
    </article>
  );
}
