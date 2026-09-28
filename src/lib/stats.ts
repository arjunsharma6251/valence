/**
 * Aggregate statistics over the bundled content. These power the public topic
 * pages, so they are derived from the question bank rather than hand-written
 * and cannot drift out of date.
 */
import { questions, topics } from "./content";
import type { Question, Topic } from "./content/types";

export interface TopicStats {
  topic: Topic;
  /** Questions in the bank for this topic. */
  count: number;
  /** Questions carrying an official ACS percent-correct figure. */
  rated: number;
  /** Mean share of national qualifiers answering correctly, or null. */
  fieldAccuracy: number | null;
  /** Hardest rated questions, lowest percent-correct first. */
  hardest: Question[];
}

export function topicStats(limit = 3): TopicStats[] {
  return topics.map((topic) => {
    const mine = questions.filter((q) => q.topic_id === topic.id && !q.id.startsWith("seed-"));
    const rated = mine.filter((q) => q.field_percent_correct != null);
    const fieldAccuracy = rated.length ? rated.reduce((s, q) => s + (q.field_percent_correct as number), 0) / rated.length : null;
    const hardest = [...rated].sort((a, b) => (a.field_percent_correct as number) - (b.field_percent_correct as number)).slice(0, limit);
    return { topic, count: mine.length, rated: rated.length, fieldAccuracy, hardest };
  });
}

/** Topics ordered hardest first by official accuracy; unrated topics last. */
export function byDifficulty(stats: TopicStats[]): TopicStats[] {
  return [...stats].sort((a, b) => (a.fieldAccuracy ?? 2) - (b.fieldAccuracy ?? 2));
}

export function getTopicStats(id: string): TopicStats | undefined {
  return topicStats().find((s) => s.topic.id === id);
}
