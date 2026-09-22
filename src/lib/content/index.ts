/**
 * Content bundle — every content file is imported here explicitly so the
 * bundle is static, tree-shakeable and works offline.
 *
 * To add an exam: run the pipeline (see /pipeline/README.md), then add one
 * import line per generated file and push it into the matching array below.
 */
import topicsJson from "../../../content/topics.json";
import seedA from "../../../content/questions/seed-a.json";
import seedB from "../../../content/questions/seed-b.json";
import seedAExpl from "../../../content/explanations/seed-a.json";
import seedBExpl from "../../../content/explanations/seed-b.json";
import seedFrq from "../../../content/frq/seed.json";

import type {
  ContentBundle,
  Explanation,
  FrqProblem,
  Question,
  Topic,
} from "./types";

export const topics: Topic[] = topicsJson as Topic[];
export const questions: Question[] = [
  ...(seedA as Question[]),
  ...(seedB as Question[]),
];
export const explanations: Explanation[] = [
  ...(seedAExpl as Explanation[]),
  ...(seedBExpl as Explanation[]),
];
export const frq: FrqProblem[] = seedFrq as FrqProblem[];

export const bundle: ContentBundle = { topics, questions, explanations, frq };

// ---- lookups -------------------------------------------------------------

const questionById = new Map(questions.map((q) => [q.id, q]));
const explanationByQuestion = new Map(
  explanations.map((e) => [e.question_id, e]),
);
const topicById = new Map(topics.map((t) => [t.id, t]));
const frqById = new Map(frq.map((f) => [f.id, f]));

export function getQuestion(id: string): Question | undefined {
  return questionById.get(id);
}
export function getExplanation(questionId: string): Explanation | undefined {
  return explanationByQuestion.get(questionId);
}
export function getTopic(id: string): Topic | undefined {
  return topicById.get(id);
}
export function getFrq(id: string): FrqProblem | undefined {
  return frqById.get(id);
}

/** Case-insensitive keyword search over stem, options and subtopic. */
export function searchQuestions(query: string): Question[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return questions.filter((q) => {
    const hay = [
      q.stem_md,
      q.subtopic,
      q.topic_id,
      ...q.options.map((o) => o.text_md),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export type { ContentBundle, Explanation, FrqProblem, Question, Topic };
