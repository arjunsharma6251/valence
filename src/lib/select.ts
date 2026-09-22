/**
 * Adaptive question selection for Practice.
 *
 * Weight each candidate by (topic weakness) × (novelty) × (fit to the
 * user's rating), then sample proportionally. Deterministic given `rand`.
 */
import type { Question, Topic } from "./content/types";
import { BASE_RATING, expectedCorrect, questionRating, type Attempt, type TopicSkill } from "./mastery";

export interface SelectOptions {
  topicId?: string | null;
  excludeIds?: Iterable<string>;
  rand?: () => number;
}

export function selectNext(
  questions: Question[],
  topics: Topic[],
  skills: Record<string, TopicSkill>,
  attempts: Attempt[],
  opts: SelectOptions = {},
): Question | null {
  const rand = opts.rand ?? Math.random;
  const exclude = new Set(opts.excludeIds ?? []);
  let pool = questions.filter((q) => !exclude.has(q.id));
  if (opts.topicId) pool = pool.filter((q) => q.topic_id === opts.topicId);
  if (pool.length === 0) {
    // Pool exhausted by exclusions: allow repeats rather than returning nothing.
    pool = opts.topicId ? questions.filter((q) => q.topic_id === opts.topicId) : questions;
    if (pool.length === 0) return null;
  }

  const lastByQuestion = new Map<string, Attempt>();
  for (const a of attempts) {
    const prev = lastByQuestion.get(a.question_id);
    if (!prev || prev.created_at < a.created_at) lastByQuestion.set(a.question_id, a);
  }

  // Mean question rating per topic: the bar the user's topic rating is measured against.
  const topicMean = new Map<string, number>();
  for (const t of topics) {
    const qs = questions.filter((q) => q.topic_id === t.id);
    const mean = qs.length ? qs.reduce((s, q) => s + questionRating(q.est_percent_correct), 0) / qs.length : BASE_RATING;
    topicMean.set(t.id, mean);
  }

  const weights = pool.map((q) => {
    const rating = skills[q.topic_id]?.rating ?? BASE_RATING;
    const qr = questionRating(q.est_percent_correct);
    // Weakness: expected accuracy on this topic; 20% → 5.3×, 50% → 3.5×, 90% → 1.1×.
    const weakness = 0.5 + 6 * (1 - expectedCorrect(rating, topicMean.get(q.topic_id) ?? BASE_RATING));
    // Novelty: never seen 1.3×, seen and wrong 1.2×, seen and right 0.4×.
    const last = lastByQuestion.get(q.id);
    const novelty = !last ? 1.3 : last.correct ? 0.4 : 1.2;
    // Fit: mild preference for questions near the user's level (σ ≈ 300 Elo).
    const d = (qr - rating) / 300;
    const fit = 0.7 + 0.6 * Math.exp(-d * d);
    return weakness * novelty * fit;
  });

  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
