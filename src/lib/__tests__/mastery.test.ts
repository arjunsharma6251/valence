import { describe, expect, it } from "vitest";
import { questions, topics } from "../content";
import { computeSkills, expectedCorrect, questionRating, rankWeakest, type Attempt } from "../mastery";
import { predictScore } from "../predict";

const byId = new Map(questions.map((q) => [q.id, q]));

function attempt(q: (typeof questions)[number], correct: boolean, i: number): Attempt {
  return { id: `a${i}`, question_id: q.id, topic_id: q.topic_id, chosen: correct ? q.correct_option : "A", correct, ms_taken: 1000, context: "practice", created_at: new Date(2026, 0, 1, 0, i).toISOString() };
}

describe("mastery", () => {
  it("harder questions get higher ratings", () => {
    expect(questionRating(0.5)).toBeCloseTo(1500);
    expect(questionRating(0.2)).toBeGreaterThan(questionRating(0.8));
  });
  it("expected correct is 0.5 at equal ratings", () => {
    expect(expectedCorrect(1500, 1500)).toBeCloseTo(0.5);
  });
  it("rating rises with correct answers and falls with misses", () => {
    const q = questions[0];
    const up = computeSkills([attempt(q, true, 1), attempt(q, true, 2)], byId, topics);
    const down = computeSkills([attempt(q, false, 1), attempt(q, false, 2)], byId, topics);
    expect(up[q.topic_id].rating).toBeGreaterThan(1500);
    expect(down[q.topic_id].rating).toBeLessThan(1500);
  });
  it("order of attempts does not matter for the merged history", () => {
    const qs = questions.slice(0, 6);
    const list = qs.map((q, i) => attempt(q, i % 2 === 0, i));
    const a = computeSkills(list, byId, topics);
    const b = computeSkills([...list].reverse(), byId, topics);
    expect(a).toEqual(b);
  });
  it("ranks attempted weak topics before unattempted ones", () => {
    const q = questions[0];
    const skills = computeSkills([attempt(q, false, 1)], byId, topics);
    expect(rankWeakest(skills)[0].topic_id).toBe(q.topic_id);
  });
  it("prediction is hidden below 40 attempts and rough below 100", () => {
    const few = questions.slice(0, 10).map((q, i) => attempt(q, true, i));
    expect(predictScore(computeSkills(few, byId, topics), topics, questions, "local")).toBeNull();
    const many = Array.from({ length: 50 }, (_, i) => attempt(questions[i % questions.length], true, i));
    const p = predictScore(computeSkills(many, byId, topics), topics, questions, "local");
    expect(p?.rough).toBe(true);
    expect(p!.score).toBeGreaterThan(30);
    expect(p!.total).toBe(60);
  });
});

describe("accuracyByDay", () => {
  it("buckets by local day so late-evening attempts land on today", async () => {
    const { accuracyByDay, localDay } = await import("../mastery");
    const now = new Date(2026, 8, 21, 23, 30); // local time
    const a = attempt(questions[0], true, 0);
    a.created_at = new Date(2026, 8, 21, 22, 0).toISOString();
    const rows = accuracyByDay([a], 7, now);
    expect(rows[rows.length - 1].day).toBe(localDay(now));
    expect(rows[rows.length - 1].total).toBe(1);
  });
});
