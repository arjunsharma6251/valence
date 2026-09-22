/**
 * Timed mock exams.
 *
 * Local: 60 questions / 110 min. National Part I: 60 questions / 90 min.
 * Questions are drawn per topic to match the real distribution, preferring
 * the requested level and skipping anything from the user's last two mocks
 * (falling back gracefully when the pool is small).
 */
import type { Level, OptionLabel, Question, Topic } from "./content/types";

export const MOCK_SPECS: Record<Level, { questions: number; minutes: number; name: string }> = {
  local: { questions: 60, minutes: 110, name: "Local exam" },
  national: { questions: 60, minutes: 90, name: "National Part I" },
};

export interface MockSession {
  id: string;
  level: Level;
  question_ids: string[];
  answers: Record<string, OptionLabel>;
  started_at: string; // ISO
  duration_s: number;
  /** Set while paused; timer stops. Only one pause allowed. */
  paused_at: string | null;
  pauses_used: number;
  submitted_at: string | null;
  score: MockScore | null;
}

export interface MockScore {
  correct: number;
  total: number;
  by_topic: Record<string, { correct: number; total: number }>;
  wrong_ids: string[];
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildMock(
  level: Level,
  questions: Question[],
  topics: Topic[],
  recentMocks: MockSession[],
  rand: () => number = Math.random,
  now = new Date(),
): MockSession {
  const spec = MOCK_SPECS[level];
  const avoid = new Set(recentMocks.slice(-2).flatMap((m) => m.question_ids));
  const chosen: string[] = [];
  const taken = new Set<string>();

  const take = (pool: Question[], n: number) => {
    for (const q of shuffle(pool, rand)) {
      if (chosen.length >= spec.questions || n <= 0) break;
      if (taken.has(q.id)) continue;
      taken.add(q.id);
      chosen.push(q.id);
      n -= 1;
    }
    return n;
  };

  for (const t of topics) {
    const want = level === "local" ? t.local_weight : t.national_weight;
    const inTopic = questions.filter((q) => q.topic_id === t.id);
    let need = want;
    // Preference order: same level & fresh → any level & fresh → same level → any.
    need = take(inTopic.filter((q) => q.level === level && !avoid.has(q.id)), need);
    need = take(inTopic.filter((q) => !avoid.has(q.id)), need);
    need = take(inTopic.filter((q) => q.level === level), need);
    take(inTopic, need);
  }
  // Fill any shortfall (small pools) from whatever is left.
  if (chosen.length < spec.questions) {
    take(questions.filter((q) => !avoid.has(q.id)), spec.questions - chosen.length);
    take(questions, spec.questions - chosen.length);
  }

  return {
    id: crypto.randomUUID(),
    level,
    question_ids: shuffle(chosen, rand),
    answers: {},
    started_at: now.toISOString(),
    duration_s: spec.minutes * 60,
    paused_at: null,
    pauses_used: 0,
    submitted_at: null,
    score: null,
  };
}

/** Seconds left on the clock. */
export function remainingSeconds(m: MockSession, now = new Date()): number {
  const ref = m.paused_at ? new Date(m.paused_at) : now;
  const elapsed = (ref.getTime() - new Date(m.started_at).getTime()) / 1000;
  return Math.max(0, Math.round(m.duration_s - elapsed));
}

export function pauseMock(m: MockSession, now = new Date()): MockSession {
  if (m.paused_at || m.pauses_used >= 1) return m;
  return { ...m, paused_at: now.toISOString(), pauses_used: m.pauses_used + 1 };
}

/** Resume shifts started_at forward by the pause length so the clock picks up where it stopped. */
export function resumeMock(m: MockSession, now = new Date()): MockSession {
  if (!m.paused_at) return m;
  const pausedFor = now.getTime() - new Date(m.paused_at).getTime();
  return {
    ...m,
    paused_at: null,
    started_at: new Date(new Date(m.started_at).getTime() + pausedFor).toISOString(),
  };
}

export function scoreMock(m: MockSession, questionById: Map<string, Question>): MockScore {
  const by_topic: MockScore["by_topic"] = {};
  const wrong_ids: string[] = [];
  let correct = 0;
  for (const id of m.question_ids) {
    const q = questionById.get(id);
    if (!q) continue;
    const bt = (by_topic[q.topic_id] ??= { correct: 0, total: 0 });
    bt.total += 1;
    if (m.answers[id] === q.correct_option) {
      correct += 1;
      bt.correct += 1;
    } else {
      wrong_ids.push(id);
    }
  }
  return { correct, total: m.question_ids.length, by_topic, wrong_ids };
}
