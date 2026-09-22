import { describe, expect, it } from "vitest";
import { questions, topics } from "../content";
import { buildMock, pauseMock, remainingSeconds, resumeMock, scoreMock } from "../mock";

const byId = new Map(questions.map((q) => [q.id, q]));
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe("mock", () => {
  it("builds 60 questions without duplicates, roughly matching the topic mix", () => {
    const m = buildMock("local", questions, topics, [], rand);
    expect(m.question_ids.length).toBe(Math.min(60, questions.length));
    expect(new Set(m.question_ids).size).toBe(m.question_ids.length);
    expect(m.duration_s).toBe(110 * 60);
  });
  it("timer survives a reload and pause shifts the start", () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const m = buildMock("national", questions, topics, [], rand, t0);
    const t1 = new Date(t0.getTime() + 60_000);
    expect(remainingSeconds(m, t1)).toBe(90 * 60 - 60);
    const paused = pauseMock(m, t1);
    const t2 = new Date(t1.getTime() + 600_000);
    expect(remainingSeconds(paused, t2)).toBe(90 * 60 - 60);
    const resumed = resumeMock(paused, t2);
    expect(remainingSeconds(resumed, t2)).toBe(90 * 60 - 60);
    expect(pauseMock(resumed, t2).paused_at).toBeNull(); // only one pause
  });
  it("scores by topic and lists misses", () => {
    const m = buildMock("local", questions, topics, [], rand);
    const first = byId.get(m.question_ids[0])!;
    m.answers[first.id] = first.correct_option;
    const s = scoreMock(m, byId);
    expect(s.correct).toBe(1);
    expect(s.wrong_ids.length).toBe(m.question_ids.length - 1);
    expect(s.by_topic[first.topic_id].correct).toBe(1);
  });
});
