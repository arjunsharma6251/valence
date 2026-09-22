import { describe, expect, it } from "vitest";
import { emptyState, mergeStates } from "../store/state";
import { newCard, reviewCard } from "../srs";

describe("mergeStates", () => {
  it("unions logs by id and keeps the newer card", () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const a = emptyState("a");
    const b = emptyState("b");
    const att = { id: "x", question_id: "q", topic_id: "t", chosen: "A" as const, correct: true, ms_taken: 1, context: "practice" as const, created_at: t0.toISOString() };
    a.attempts = [att];
    b.attempts = [att, { ...att, id: "y" }];
    a.cards = { q: newCard("q", t0) };
    b.cards = { q: reviewCard(newCard("q", t0), true, new Date(t0.getTime() + 1000)) };
    b.profile.target = "national";
    const m = mergeStates(a, b);
    expect(m.attempts.map((x) => x.id)).toEqual(["x", "y"]);
    expect(m.cards.q.reps).toBe(1);
    expect(m.profile.target).toBe("national");
    expect(m.anon_id).toBe("a");
  });
});
