"use client";
/**
 * Derived, memoized views over the store: skills, weak topics, due cards,
 * prediction. Recomputed only when the underlying slice changes.
 */
import { useMemo } from "react";
import { questions, topics, getQuestion } from "../content";
import { computeSkills, rankWeakest, type TopicSkill } from "../mastery";
import { predictScore } from "../predict";
import { dueCards } from "../srs";
import { useStore } from "./index";

const questionById = new Map(questions.map((q) => [q.id, q]));

export function useSkills(): Record<string, TopicSkill> {
  const attempts = useStore((s) => s.attempts);
  return useMemo(() => computeSkills(attempts, questionById, topics), [attempts]);
}

export function useWeakTopics(): TopicSkill[] {
  const skills = useSkills();
  return useMemo(() => rankWeakest(skills), [skills]);
}

export function useDueCards() {
  const cards = useStore((s) => s.cards);
  return useMemo(() => dueCards(cards).filter((c) => getQuestion(c.question_id)), [cards]);
}

export function usePrediction(level: "local" | "national") {
  const skills = useSkills();
  return useMemo(() => predictScore(skills, topics, questions, level), [skills, level]);
}
