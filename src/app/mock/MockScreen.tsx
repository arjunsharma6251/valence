"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Button, Card, Eyebrow, LinkButton, Pill, Skeleton } from "@/components/ui";
import { getQuestion, getTopic, questions, topics } from "@/lib/content";
import type { Level } from "@/lib/content/types";
import { MOCK_SPECS, buildMock, pauseMock, remainingSeconds, resumeMock, scoreMock, type MockSession } from "@/lib/mock";
import { discardMock, recordMockAttempts, saveMock } from "@/lib/store/actions";
import { useHydrated, useStore } from "@/lib/store";
import { track } from "@/lib/analytics";

const questionById = new Map(questions.map((q) => [q.id, q]));

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/**
 * Mock exams. The session (question ids, answers, start time) is persisted
 * on every change, so a refresh restores the exact clock. One pause allowed.
 */
export function MockScreen() {
  const hydrated = useHydrated();
  const mocks = useStore((s) => s.mocks);
  const active = useMemo(() => mocks.find((m) => !m.submitted_at) ?? null, [mocks]);
  const [reportId, setReportId] = useState<string | null>(null);

  if (!hydrated) return <Skeleton className="h-64" />;
  if (active) return <Running mock={active} onSubmitted={(id) => setReportId(id)} />;

  const report = reportId ? mocks.find((m) => m.id === reportId) : null;
  if (report?.score) return <Report mock={report} onClose={() => setReportId(null)} />;

  return <Lobby mocks={mocks} onOpen={setReportId} />;
}

function Lobby({ mocks, onOpen }: { mocks: MockSession[]; onOpen: (id: string) => void }) {
  const start = (level: Level) => {
    const m = buildMock(level, questions, topics, mocks.filter((x) => x.submitted_at));
    saveMock(m);
    track("mock_started", { level, questions: m.question_ids.length });
  };
  const past = [...mocks].filter((m) => m.submitted_at).reverse();
  return (
    <div className="space-y-5">
      <header className="animate-rise">
        <h1 className="text-[24px] font-semibold tracking-tight">Mock exam</h1>
        <p className="mt-1 text-[15px] text-muted">Timed, drawn to match the real topic mix. No feedback until you submit; misses go to Review.</p>
      </header>
      <div className="grid gap-3 animate-rise [animation-delay:60ms]">
        {(Object.keys(MOCK_SPECS) as Level[]).map((level) => {
          const spec = MOCK_SPECS[level];
          return (
            <Card key={level} className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[17px] font-semibold">{spec.name}</p>
                <p className="text-[13px] text-muted">{spec.questions} questions · {spec.minutes} minutes</p>
              </div>
              <Button onClick={() => start(level)}>Start</Button>
            </Card>
          );
        })}
      </div>
      {questions.length < 60 && (
        <p className="text-[13px] text-faint">The bank has {questions.length} questions right now, so a mock repeats the whole set. It fills out as exams are added.</p>
      )}
      {past.length > 0 && (
        <Card className="animate-rise [animation-delay:120ms]">
          <Eyebrow>Past mocks</Eyebrow>
          <ul className="mt-2 divide-y divide-line">
            {past.map((m) => (
              <li key={m.id}>
                <button onClick={() => onOpen(m.id)} className="w-full min-h-12 flex items-center gap-3 text-left text-[15px]">
                  <span className="flex-1">{MOCK_SPECS[m.level].name}</span>
                  <span className="text-[13px] text-faint">{new Date(m.started_at).toLocaleDateString()}</span>
                  <span className="font-semibold">{m.score?.correct}/{m.score?.total}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Running({ mock, onSubmitted }: { mock: MockSession; onSubmitted: (id: string) => void }) {
  const [i, setI] = useState(() => Math.max(0, mock.question_ids.findIndex((id) => !mock.answers[id])));
  const [left, setLeft] = useState(() => remainingSeconds(mock));
  const [confirm, setConfirm] = useState(false);
  const id = mock.question_ids[i];
  const q = getQuestion(id);
  const answered = Object.keys(mock.answers).length;

  const submit = () => {
    const scored = { ...mock, submitted_at: new Date().toISOString(), score: scoreMock(mock, questionById) };
    recordMockAttempts(scored);
    saveMock(scored);
    track("mock_completed", { level: mock.level, correct: scored.score!.correct, total: scored.score!.total });
    onSubmitted(scored.id);
  };

  useEffect(() => {
    const t = setInterval(() => setLeft(remainingSeconds(mock)), 1000);
    return () => clearInterval(t);
  }, [mock]);

  // Time's up → submit automatically.
  useEffect(() => {
    if (left <= 0 && !mock.paused_at) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (!q) return null;

  if (mock.paused_at) {
    return (
      <Card className="animate-rise text-center">
        <Eyebrow>Paused</Eyebrow>
        <p className="mt-2 text-[34px] font-semibold tracking-tight">{fmt(left)}</p>
        <p className="mt-1 text-[14px] text-muted">{answered} of {mock.question_ids.length} answered. This was your one pause.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => saveMock(resumeMock(mock))}>Resume</Button>
          <Button variant="ghost" onClick={() => discardMock(mock.id)}>Discard mock</Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 px-4 py-2 bg-bg/90 backdrop-blur border-b border-line flex items-center gap-3 text-[14px]">
        <span className={`font-semibold tabular-nums ${left < 300 ? "text-bad" : ""}`} aria-live="off">{fmt(left)}</span>
        <span className="text-faint">{answered}/{mock.question_ids.length}</span>
        <div className="ml-auto flex gap-1">
          {mock.pauses_used === 0 && <Button variant="ghost" className="min-h-9 px-3 text-[13px]" onClick={() => saveMock(pauseMock(mock))}>Pause</Button>}
          <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setConfirm(true)}>Submit</Button>
        </div>
      </div>

      {confirm && (
        <Card className="mt-3 animate-pop flex flex-wrap items-center gap-3">
          <p className="flex-1 text-[15px]">Submit with {mock.question_ids.length - answered} unanswered?</p>
          <Button onClick={submit}>Submit</Button>
          <Button variant="ghost" onClick={() => setConfirm(false)}>Keep going</Button>
        </Card>
      )}

      <div className="mt-4">
        <QuestionCard
          key={id}
          question={q}
          mode="mock"
          selected={mock.answers[id] ?? null}
          position={`${i + 1} of ${mock.question_ids.length}`}
          onAnswer={(label) => saveMock({ ...mock, answers: { ...mock.answers, [id]: label } })}
          onNext={() => setI((x) => Math.min(mock.question_ids.length - 1, x + 1))}
          nextLabel={i === mock.question_ids.length - 1 ? "Last question" : "Next"}
        />
      </div>

      <div className="mt-6 grid grid-cols-10 gap-1.5" aria-label="Question grid">
        {mock.question_ids.map((qid, idx) => (
          <button
            key={qid}
            onClick={() => setI(idx)}
            aria-current={idx === i}
            className={`h-9 rounded-lg text-[12px] font-medium border transition-colors ${
              idx === i ? "border-accent text-accent bg-accent-wash" : mock.answers[qid] ? "border-line bg-accent-wash text-fg" : "border-line text-faint"
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
      {i > 0 && <Button variant="ghost" className="mt-3" onClick={() => setI((x) => x - 1)}>Previous</Button>}
    </div>
  );
}

function Report({ mock, onClose }: { mock: MockSession; onClose: () => void }) {
  const s = mock.score!;
  const pct = Math.round((100 * s.correct) / s.total);
  const rows = Object.entries(s.by_topic).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  return (
    <div className="space-y-5">
      <Card className="animate-rise">
        <Eyebrow>{MOCK_SPECS[mock.level].name} · {new Date(mock.started_at).toLocaleDateString()}</Eyebrow>
        <p className="mt-1 text-[40px] font-semibold tracking-tight leading-none">{s.correct}<span className="text-[18px] text-faint font-normal"> / {s.total}</span></p>
        <p className="mt-1 text-[14px] text-muted">{pct}% · {s.wrong_ids.length} added to Review</p>
      </Card>
      <Card className="animate-rise [animation-delay:60ms]">
        <Eyebrow>By topic</Eyebrow>
        <ul className="mt-2 divide-y divide-line">
          {rows.map(([tid, r]) => (
            <li key={tid} className="py-2.5 flex items-center gap-3 text-[15px]">
              <Link href={`/practice?topic=${tid}`} className="flex-1 hover:text-accent">{getTopic(tid)?.name ?? tid}</Link>
              <div className="w-24 h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${(100 * r.correct) / r.total}%` }} /></div>
              <span className="w-10 text-right tabular-nums">{r.correct}/{r.total}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="animate-rise [animation-delay:120ms]">
        <Eyebrow>Missed</Eyebrow>
        <ul className="mt-2 divide-y divide-line">
          {s.wrong_ids.map((id) => {
            const q = getQuestion(id);
            if (!q) return null;
            return (
              <li key={id} className="py-2">
                <Link href={`/q/${id}`} className="block text-[14px] hover:text-accent">
                  <Pill tone="neutral" className="mr-2">{getTopic(q.topic_id)?.name}</Pill>
                  <span className="text-muted">you: {mock.answers[id] ?? "—"} · answer: {q.correct_option}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
      <div className="flex gap-2">
        <LinkButton href="/review">Review misses</LinkButton>
        <Button variant="secondary" onClick={onClose}>Back</Button>
      </div>
    </div>
  );
}
