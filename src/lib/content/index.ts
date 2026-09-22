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
import q2016Local from "../../../content/questions/2016-local.json";
import q2017Local from "../../../content/questions/2017-local.json";
import q2018Local from "../../../content/questions/2018-local.json";
import q2019Local from "../../../content/questions/2019-local.json";
import q2020Local from "../../../content/questions/2020-local.json";
import q2021Local from "../../../content/questions/2021-local.json";
import q2022Local from "../../../content/questions/2022-local.json";
import q2023Local from "../../../content/questions/2023-local.json";
import q2023LocalB from "../../../content/questions/2023-local-b.json";
import q2024Local from "../../../content/questions/2024-local.json";
import q2025Local from "../../../content/questions/2025-local.json";
import q2026Local from "../../../content/questions/2026-local.json";
import q2016National from "../../../content/questions/2016-national.json";
import q2017National from "../../../content/questions/2017-national.json";
import q2018National from "../../../content/questions/2018-national.json";
import q2019National from "../../../content/questions/2019-national.json";
import q2020National from "../../../content/questions/2020-national.json";
import q2021National from "../../../content/questions/2021-national.json";
import q2022National from "../../../content/questions/2022-national.json";
import q2023National from "../../../content/questions/2023-national.json";
import q2024National from "../../../content/questions/2024-national.json";
import q2025National from "../../../content/questions/2025-national.json";
import q2026National from "../../../content/questions/2026-national.json";

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
  ...([q2016Local, q2017Local, q2018Local, q2019Local, q2020Local, q2021Local, q2022Local, q2023Local, q2023LocalB, q2024Local, q2025Local, q2026Local, q2016National, q2017National, q2018National, q2019National, q2020National, q2021National, q2022National, q2023National, q2024National, q2025National, q2026National].flat() as Question[]),
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
