/**
 * Elo-style mastery model.
 *
 * Every topic has a user rating (start 1500). Every question has a rating
 * derived from its estimated percent-correct. Each attempt updates the
 * topic rating toward the question rating, with a K that shrinks as the
 * user accumulates attempts in that topic.
 *
 * Ratings are derived by replaying attempts in time order, so merging
 * local and server histories is a set union — nothing else to reconcile.
 */
import type { Question, Topic } from "./content/types";

export const BASE_RATING = 1500;
const SCALE = 400;

export interface Attempt {
  id: string; // uuid
  question_id: string;
  topic_id: string;
  chosen: "A" | "B" | "C" | "D";
  correct: boolean;
  ms_taken: number;
  context: "practice" | "mock" | "review";
  created_at: string; // ISO
}

export interface TopicSkill {
  topic_id: string;
  rating: number;
  attempts: number;
  correct: number;
  updated_at: string | null;
}

/** Question rating from estimated fraction correct: p=0.5 → 1500, p=0.2 → ~1741. */
export function questionRating(estPercentCorrect: number): number {
  const p = Math.min(0.99, Math.max(0.01, estPercentCorrect));
  return BASE_RATING - SCALE * Math.log10(p / (1 - p));
}

/** Probability the user answers correctly. */
export function expectedCorrect(userRating: number, qRating: number): number {
  return 1 / (1 + Math.pow(10, (qRating - userRating) / SCALE));
}

export function kFactor(attemptsSoFar: number): number {
  if (attemptsSoFar < 10) return 40;
  if (attemptsSoFar < 30) return 28;
  return 16;
}

export function emptySkill(topicId: string): TopicSkill {
  return { topic_id: topicId, rating: BASE_RATING, attempts: 0, correct: 0, updated_at: null };
}

/** Replay attempts (any order) into per-topic skills. */
export function computeSkills(
  attempts: Attempt[],
  questionById: Map<string, Question>,
  topics: Topic[],
): Record<string, TopicSkill> {
  const skills: Record<string, TopicSkill> = {};
  for (const t of topics) skills[t.id] = emptySkill(t.id);
  const ordered = [...attempts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const a of ordered) {
    const q = questionById.get(a.question_id);
    const s = skills[a.topic_id] ?? (skills[a.topic_id] = emptySkill(a.topic_id));
    const qr = q ? questionRating(q.est_percent_correct) : BASE_RATING;
    const e = expectedCorrect(s.rating, qr);
    s.rating += kFactor(s.attempts) * ((a.correct ? 1 : 0) - e);
    s.attempts += 1;
    if (a.correct) s.correct += 1;
    s.updated_at = a.created_at;
  }
  return skills;
}

/** Topics ordered weakest first. Unattempted topics sort after attempted weak ones. */
export function rankWeakest(skills: Record<string, TopicSkill>): TopicSkill[] {
  return Object.values(skills).sort((a, b) => {
    if (a.attempts === 0 && b.attempts === 0) return 0;
    if (a.attempts === 0) return 1;
    if (b.attempts === 0) return -1;
    return a.rating - b.rating;
  });
}

/** YYYY-MM-DD in the user's local time zone (attempts are stored in UTC). */
export function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Accuracy over the last N days (local days), for the trend line. */
export function accuracyByDay(attempts: Attempt[], days: number, now = new Date()): { day: string; total: number; correct: number }[] {
  const out: { day: string; total: number; correct: number }[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const buckets = new Map<string, { total: number; correct: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(localDay(d), { total: 0, correct: 0 });
  }
  for (const a of attempts) {
    const key = localDay(new Date(a.created_at));
    const b = buckets.get(key);
    if (!b) continue;
    b.total += 1;
    if (a.correct) b.correct += 1;
  }
  for (const [day, v] of buckets) out.push({ day, ...v });
  return out;
}
