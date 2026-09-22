import { describe, expect, it } from "vitest";
import { dueCards, isDue, newCard, reviewCard } from "../srs";

describe("SM-2", () => {
  const t0 = new Date("2026-01-01T00:00:00Z");
  it("new cards are due immediately", () => {
    expect(isDue(newCard("q1", t0), t0)).toBe(true);
  });
  it("intervals grow 1 → 6 → ×ease on correct answers", () => {
    let c = newCard("q1", t0);
    c = reviewCard(c, true, t0);
    expect(c.interval).toBe(1);
    expect(isDue(c, t0)).toBe(false);
    c = reviewCard(c, true, t0);
    expect(c.interval).toBe(6);
    c = reviewCard(c, true, t0);
    expect(c.interval).toBeGreaterThan(6);
  });
  it("a miss resets to 1 day and lowers ease (floor 1.3)", () => {
    let c = newCard("q1", t0);
    c = reviewCard(c, true, t0);
    c = reviewCard(c, true, t0);
    c = reviewCard(c, false, t0);
    expect(c.interval).toBe(1);
    expect(c.ease).toBeLessThan(2.5);
    for (let i = 0; i < 20; i++) c = reviewCard(c, false, t0);
    expect(c.ease).toBeCloseTo(1.3);
  });
  it("dueCards filters and sorts", () => {
    const later = new Date(t0.getTime() + 86_400_000 * 2);
    const cards = { a: reviewCard(newCard("a", t0), true, t0), b: newCard("b", t0) };
    expect(dueCards(cards, t0).map((c) => c.question_id)).toEqual(["b"]);
    expect(dueCards(cards, later).map((c) => c.question_id)).toEqual(["b", "a"]);
  });
});
