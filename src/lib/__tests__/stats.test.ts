import { describe, expect, it } from "vitest";
import { topics } from "../content";
import { byDifficulty, getTopicStats, topicStats } from "../stats";

describe("topic statistics", () => {
  const stats = topicStats();

  it("covers every topic and counts only real exam questions", () => {
    expect(stats).toHaveLength(topics.length);
    for (const s of stats) {
      expect(s.count).toBeGreaterThan(0);
      expect(s.rated).toBeLessThanOrEqual(s.count);
    }
  });

  it("reports official accuracy as a fraction and finds the hardest questions", () => {
    for (const s of stats) {
      if (s.fieldAccuracy === null) continue;
      expect(s.fieldAccuracy).toBeGreaterThan(0);
      expect(s.fieldAccuracy).toBeLessThan(1);
      expect(s.hardest.length).toBeGreaterThan(0);
      const pcts = s.hardest.map((q) => q.field_percent_correct as number);
      expect([...pcts].sort((a, b) => a - b)).toEqual(pcts);
      expect(pcts[0]).toBeLessThanOrEqual(s.fieldAccuracy);
    }
  });

  it("orders hardest first and leaves unrated topics at the end", () => {
    const ordered = byDifficulty(stats).map((s) => s.fieldAccuracy);
    const rated = ordered.filter((a): a is number => a !== null);
    expect([...rated].sort((a, b) => a - b)).toEqual(rated);
    expect(ordered.slice(rated.length).every((a) => a === null)).toBe(true);
  });

  it("looks a topic up by id", () => {
    expect(getTopicStats("organic")?.topic.id).toBe("organic");
    expect(getTopicStats("nope")).toBeUndefined();
  });
});
