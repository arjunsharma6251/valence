/**
 * Predicted exam score = Σ over topics of (questions on the exam from that
 * topic) × P(correct | user topic rating, mean question rating for that
 * topic and level). Labeled "rough" until the user has PREDICTION_SOLID
 * attempts, and hidden entirely below PREDICTION_MIN.
 */
import type { Level, Question, Topic } from "./content/types";
import { BASE_RATING, expectedCorrect, questionRating, type TopicSkill } from "./mastery";

export const PREDICTION_MIN = 40;
export const PREDICTION_SOLID = 100;

export interface Prediction {
  score: number; // out of `total`
  total: number;
  rough: boolean;
}

export function meanQuestionRating(questions: Question[], topicId: string, level: Level): number {
  const pool = questions.filter((q) => q.topic_id === topicId && q.level === level);
  const fallback = questions.filter((q) => q.topic_id === topicId);
  const use = pool.length >= 3 ? pool : fallback;
  if (use.length === 0) return BASE_RATING;
  return use.reduce((s, q) => s + questionRating(q.est_percent_correct), 0) / use.length;
}

export function predictScore(
  skills: Record<string, TopicSkill>,
  topics: Topic[],
  questions: Question[],
  level: Level,
): Prediction | null {
  const attempts = Object.values(skills).reduce((s, k) => s + k.attempts, 0);
  if (attempts < PREDICTION_MIN) return null;
  let score = 0;
  let total = 0;
  for (const t of topics) {
    const w = level === "local" ? t.local_weight : t.national_weight;
    const s = skills[t.id];
    const rating = s?.rating ?? BASE_RATING;
    score += w * expectedCorrect(rating, meanQuestionRating(questions, t.id, level));
    total += w;
  }
  return { score: Math.round(score), total, rough: attempts < PREDICTION_SOLID };
}
