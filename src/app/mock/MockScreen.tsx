"use client";
import { useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { Button, Group, GroupFooter, GroupHeader, LargeTitle, LinkButton, Narrow, Row, Skeleton, Tag, usePageTitle } from "@/components/ui";
import { IconPause, IconShare } from "@/components/icons";
import { CountUp } from "@/components/CountUp";
import { shareImage } from "@/lib/share";
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
    <Narrow className="stagger">
      <LargeTitle className="pt-1 pb-4">Mock exam</LargeTitle>
      <Group>
        {(Object.keys(MOCK_SPECS) as Level[]).map((level) => {
          const spec = MOCK_SPECS[level];
          return (
            <Row key={level} title={spec.name} detail={`${spec.questions} questions · ${spec.minutes} minutes`}>
              <Button size="compact" onClick={() => start(level)}>Start</Button>
            </Row>
          );
        })}
      </Group>
      <GroupFooter>Drawn to match the real topic mix. No feedback until you submit; misses go to Review.{questions.length < 60 ? ` The bank has ${questions.length} questions right now, so a mock repeats the set.` : ""}</GroupFooter>
      {past.length > 0 && (
        <>
          <GroupHeader>Past mocks</GroupHeader>
          <Group>
            {past.map((m) => (
              <Row key={m.id} onClick={() => onOpen(m.id)} chevron title={MOCK_SPECS[m.level].name} detail={new Date(m.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} value={<span className="font-semibold text-label">{m.score?.correct}/{m.score?.total}</span>} />
            ))}
          </Group>
        </>
      )}
    </Narrow>
  );
}

function Running({ mock, onSubmitted }: { mock: MockSession; onSubmitted: (id: string) => void }) {
  usePageTitle(MOCK_SPECS[mock.level].name);
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

  useEffect(() => {
    if (left <= 0 && !mock.paused_at) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (!q) return null;

  if (mock.paused_at) {
    return (
      <Narrow>
        <LargeTitle className="pt-1 pb-4">Paused</LargeTitle>
        <Group>
          <div className="px-4 py-5 text-center">
            <p className="text-large-title font-bold tracking-[-0.02em] tnum">{fmt(left)}</p>
            <p className="mt-1 text-footnote text-label-2 tnum">{answered} of {mock.question_ids.length} answered. This was your one pause.</p>
          </div>
        </Group>
        <div className="pt-4 space-y-2">
          <Button className="w-full" onClick={() => saveMock(resumeMock(mock))}>Resume</Button>
          <Button variant="destructive" className="w-full" onClick={() => discardMock(mock.id)}>Discard mock</Button>
        </div>
      </Narrow>
    );
  }

  return (
    <div>
      <div className="sticky top-[52px] md:top-[60px] z-20 -mx-4 px-4 md:-mx-6 md:px-6 py-1.5 bg-ground/92 backdrop-blur-xl border-b border-sep flex items-center gap-3">
        <span className={`text-headline font-semibold tnum ${left < 300 ? "text-red" : ""}`}>{fmt(left)}</span>
        <span className="text-footnote text-label-2 tnum">{answered}/{mock.question_ids.length}</span>
        <div className="ml-auto flex items-center gap-1">
          {mock.pauses_used === 0 && (
            <Button variant="plain" size="compact" onClick={() => saveMock(pauseMock(mock))} aria-label="Pause"><IconPause size={18} /> Pause</Button>
          )}
          <Button variant="tinted" size="compact" onClick={() => setConfirm(true)}>Submit</Button>
        </div>
      </div>

      {confirm && (
        <Group className="mt-3 animate-rise">
          <Row title={`Submit with ${mock.question_ids.length - answered} unanswered?`} detail="You can't return to the exam after submitting." />
          <div className="flex gap-2 px-4 py-3">
            <Button size="compact" onClick={submit}>Submit</Button>
            <Button variant="plain" size="compact" onClick={() => setConfirm(false)}>Keep going</Button>
          </div>
        </Group>
      )}

      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-8 lg:items-start">
      <div>
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
        {i > 0 && <div className="pt-3"><Button variant="plain" size="compact" onClick={() => setI((x) => x - 1)}>Previous</Button></div>}
      </div>

      <div className="lg:sticky lg:top-[112px]">
      <GroupHeader>Questions</GroupHeader>
      <Group>
        <div className="grid grid-cols-10 gap-1.5 p-3" aria-label="Question grid">
          {mock.question_ids.map((qid, idx) => (
            <button
              key={qid}
              onClick={() => setI(idx)}
              aria-current={idx === i}
              className={`h-9 rounded-[8px] text-caption font-semibold tnum transition-colors ${
                idx === i ? "bg-accent text-accent-on" : mock.answers[qid] ? "bg-accent-tint text-accent" : "bg-fill text-label-2"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </Group>
      </div>
      </div>
    </div>
  );
}

function Report({ mock, onClose }: { mock: MockSession; onClose: () => void }) {
  const s = mock.score!;
  const pct = Math.round((100 * s.correct) / s.total);
  const [shareState, setShareState] = useState<"idle" | "busy" | "done">("idle");
  const shareQuery = `l=${mock.level}&c=${s.correct}&t=${s.total}&b=${encodeURIComponent(topics.map((t) => { const r = s.by_topic[t.id]; return r ? `${r.correct}-${r.total}` : "0-0"; }).join(","))}`;
  const shareScore = async () => {
    setShareState("busy");
    await shareImage(`/api/og/mock?${shareQuery}`, `valence-mock-${s.correct}-of-${s.total}.png`, `/s/mock?${shareQuery}`, `${s.correct}/${s.total} on a USNCO ${MOCK_SPECS[mock.level].name.toLowerCase()} mock`);
    setShareState("done");
    setTimeout(() => setShareState("idle"), 2200);
  };
  const rows = Object.entries(s.by_topic).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  return (
    <Narrow className="stagger">
      <LargeTitle className="pt-1 pb-4">Score report</LargeTitle>
      <Group>
        <div className="px-4 py-4">
          <p className="font-display text-large-title font-bold tracking-[-0.02em] leading-none tnum"><CountUp value={s.correct} /><span className="text-title text-label-2 font-medium"> / {s.total}</span></p>
          <p className="mt-1.5 text-footnote text-label-2">{MOCK_SPECS[mock.level].name} · {new Date(mock.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {pct}% · {s.wrong_ids.length} added to Review</p>
        </div>
      </Group>
      <GroupHeader>By topic</GroupHeader>
      <Group>
        {rows.map(([tid, r]) => (
          <Row key={tid} href={`/practice?topic=${tid}`} title={getTopic(tid)?.name ?? tid} value={<span className="tnum">{r.correct}/{r.total}</span>}>
            <span className="w-20 h-1.5 rounded-full bg-fill overflow-hidden shrink-0"><span className="grow block h-full bg-accent rounded-full" style={{ width: `${(100 * r.correct) / r.total}%` }} /></span>
          </Row>
        ))}
      </Group>
      {s.wrong_ids.length > 0 && (
        <>
          <GroupHeader>Missed</GroupHeader>
          <Group>
            {s.wrong_ids.map((id) => {
              const q = getQuestion(id);
              if (!q) return null;
              return <Row key={id} href={`/q/${id}`} title={getTopic(q.topic_id)?.name} detail={`You: ${mock.answers[id] ?? "—"} · Answer: ${q.correct_option}`} value={<Tag tone={mock.answers[id] ? "red" : "neutral"}>{mock.answers[id] ? "wrong" : "blank"}</Tag>} />;
            })}
          </Group>
        </>
      )}
      <div className="pt-4 space-y-2">
        <LinkButton href="/review" className="w-full">Review misses</LinkButton>
        <Button variant="tinted" className="w-full" onClick={shareScore} disabled={shareState === "busy"}>
          <IconShare size={18} /> {shareState === "done" ? "Shared" : shareState === "busy" ? "Preparing card…" : "Share score card"}
        </Button>
        <Button variant="plain" className="w-full" onClick={onClose}>Back</Button>
      </div>
    </Narrow>
  );
}
