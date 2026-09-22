/**
 * SM-2 spaced repetition for missed questions.
 *
 * A card is created the moment a question is missed, due immediately
 * ("review what you missed today"). Each review grades the card: correct →
 * quality 4, wrong → quality 1. Intervals follow SM-2: 1 day, 6 days, then
 * previous × ease. Dismissing a card deletes it.
 */
export interface Card {
  question_id: string;
  interval: number; // days
  ease: number;
  reps: number;
  due_at: string; // ISO
  updated_at: string; // ISO
}

const DAY_MS = 86_400_000;

export function newCard(questionId: string, now = new Date()): Card {
  return {
    question_id: questionId,
    interval: 0,
    ease: 2.5,
    reps: 0,
    due_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

export function reviewCard(card: Card, correct: boolean, now = new Date()): Card {
  const q = correct ? 4 : 1;
  let { interval, ease, reps } = card;
  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);
  }
  ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return {
    ...card,
    interval,
    ease,
    reps,
    due_at: new Date(now.getTime() + interval * DAY_MS).toISOString(),
    updated_at: now.toISOString(),
  };
}

export function isDue(card: Card, now = new Date()): boolean {
  return new Date(card.due_at).getTime() <= now.getTime();
}

export function dueCards(cards: Record<string, Card>, now = new Date()): Card[] {
  return Object.values(cards)
    .filter((c) => isDue(c, now))
    .sort((a, b) => a.due_at.localeCompare(b.due_at));
}
