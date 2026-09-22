import { describe, expect, it } from "vitest";
import { questions, topics } from "../content";
import { computeSkills, type Attempt } from "../mastery";
import { selectNext } from "../select";

const byId = new Map(questions.map((q) => [q.id, q]));

describe("selectNext", () => {
  it("respects the topic filter and exclusions", () => {
    const skills = computeSkills([], byId, topics);
    const q = selectNext(questions, topics, skills, [], { topicId: "kinetics", rand: () => 0.5 });
    expect(q?.topic_id).toBe("kinetics");
    const ids = questions.filter((x) => x.topic_id === "kinetics").map((x) => x.id);
    const rest = selectNext(questions, topics, skills, [], { topicId: "kinetics", excludeIds: ids.slice(1), rand: () => 0 });
    expect(rest?.id).toBe(ids[0]);
  });
  it("samples a missed topic far more than a mastered one, and unseen over seen-correct", () => {
    const weak = "thermodynamics";
    const strong = "kinetics";
    const mk = (topic: string, correct: boolean, offset: number): Attempt[] =>
      questions.filter((q) => q.topic_id === topic).map((q, i) => ({ id: `${topic}${i}`, question_id: q.id, topic_id: q.topic_id, chosen: correct ? q.correct_option : "A", correct, ms_taken: 1, context: "practice", created_at: new Date(2026, 0, 1, 0, offset + i).toISOString() }));
    const attempts = [...mk(weak, false, 0), ...mk(strong, true, 100)];
    const skills = computeSkills(attempts, byId, topics);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 600; i++) {
      const q = selectNext(questions, topics, skills, attempts, { rand })!;
      counts[q.topic_id] = (counts[q.topic_id] ?? 0) + 1;
    }
    expect(counts[weak]).toBeGreaterThan(5 * (counts[strong] ?? 0));
    // The weak topic is over-represented versus a neutral, unseen topic too.
    expect(counts[weak]).toBeGreaterThan(counts["organic"]);
  });
});
