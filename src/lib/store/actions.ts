"use client";
/**
 * Write helpers. Each one is a small, named mutation so screens never
 * spread state by hand. All timestamps are ISO strings (UTC).
 */
import { getQuestion } from "../content";
import type { OptionLabel } from "../content/types";
import type { Attempt } from "../mastery";
import { newCard, reviewCard } from "../srs";
import type { MockSession } from "../mock";
import { update } from "./index";
import type { Flag, FrqSubmission, Profile } from "./state";

const RECENT_LIMIT = 30;

export function recordAttempt(input: {
  question_id: string;
  chosen: OptionLabel;
  ms_taken: number;
  context: Attempt["context"];
}): Attempt | null {
  const q = getQuestion(input.question_id);
  if (!q) return null;
  const attempt: Attempt = {
    id: crypto.randomUUID(),
    question_id: q.id,
    topic_id: q.topic_id,
    chosen: input.chosen,
    correct: input.chosen === q.correct_option,
    ms_taken: input.ms_taken,
    context: input.context,
    created_at: new Date().toISOString(),
  };
  update((s) => {
    const cards = { ...s.cards };
    const existing = cards[q.id];
    if (input.context === "review" && existing) {
      cards[q.id] = reviewCard(existing, attempt.correct);
    } else if (!attempt.correct && !existing) {
      cards[q.id] = newCard(q.id);
    } else if (!attempt.correct && existing) {
      cards[q.id] = reviewCard(existing, false);
    }
    return {
      ...s,
      attempts: [...s.attempts, attempt],
      cards,
      recent_ids: [...s.recent_ids.filter((id) => id !== q.id), q.id].slice(-RECENT_LIMIT),
    };
  });
  return attempt;
}

export function dismissCard(questionId: string) {
  update((s) => {
    const cards = { ...s.cards };
    delete cards[questionId];
    return { ...s, cards };
  });
}

export function addFlag(input: Omit<Flag, "id" | "created_at">): Flag {
  const flag: Flag = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  update((s) => ({ ...s, flags: [...s.flags, flag] }));
  return flag;
}

export function saveMock(mock: MockSession) {
  update((s) => {
    const others = s.mocks.filter((m) => m.id !== mock.id);
    return { ...s, mocks: [...others, mock].sort((a, b) => a.started_at.localeCompare(b.started_at)) };
  });
}

export function discardMock(id: string) {
  update((s) => ({ ...s, mocks: s.mocks.filter((m) => m.id !== id) }));
}

export function setProfile(profile: Partial<Profile>) {
  update((s) => ({ ...s, profile: { ...s.profile, ...profile } }));
}

export function setTheme(theme: "system" | "light" | "dark") {
  update((s) => ({ ...s, theme }));
}

export function saveFrqDraft(frqId: string, answers: Record<string, string>) {
  update((s) => ({ ...s, frq_drafts: { ...s.frq_drafts, [frqId]: answers } }));
}

export function addFrqSubmission(sub: FrqSubmission) {
  update((s) => ({ ...s, frq_submissions: [...s.frq_submissions, sub] }));
}

/**
 * Record every *answered* question of a submitted mock in one write (adds SRS
 * cards for misses). Unanswered questions count as wrong on the score report
 * but are not evidence about skill, so they don't touch ratings or cards.
 */
export function recordMockAttempts(mock: MockSession) {
  const now = new Date().toISOString();
  update((s) => {
    const cards = { ...s.cards };
    const attempts = [...s.attempts];
    for (const id of mock.question_ids) {
      const q = getQuestion(id);
      if (!q) continue;
      const chosen = mock.answers[id];
      if (!chosen) continue;
      const correct = chosen === q.correct_option;
      attempts.push({
        id: crypto.randomUUID(),
        question_id: id,
        topic_id: q.topic_id,
        chosen,
        correct,
        ms_taken: 0,
        context: "mock",
        created_at: now,
      });
      if (!correct) cards[id] = cards[id] ? reviewCard(cards[id], false) : newCard(id);
    }
    return { ...s, attempts, cards };
  });
}
