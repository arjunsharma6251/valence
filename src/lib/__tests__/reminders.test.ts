import { describe, expect, it } from "vitest";
import { composeReminder, decide, weakestTopic } from "../reminders";

const now = Date.parse("2026-09-24T12:00:00Z");
const base = { user_id: "u", email: "a@b.c", reminders_enabled: true, reminders_paused_at: null, last_reminded_at: null, unsubscribe_token: "t" };
const facts = { due: 3, weakestTopic: "equilibrium", lastAttemptAt: null, sendsSinceLastAttempt: 0 };

describe("reminder decisions", () => {
  it("sends when something is due and nothing blocks it", () => {
    expect(decide(base, facts, now)).toEqual({ send: true });
  });
  it("never sends with nothing due, when disabled, paused, or without an email", () => {
    expect(decide(base, { ...facts, due: 0 }, now)).toMatchObject({ send: false, reason: "nothing_due" });
    expect(decide({ ...base, reminders_enabled: false }, facts, now)).toMatchObject({ reason: "disabled" });
    expect(decide({ ...base, reminders_paused_at: "2026-09-01T00:00:00Z" }, facts, now)).toMatchObject({ reason: "paused" });
    expect(decide({ ...base, email: null }, facts, now)).toMatchObject({ reason: "no_email" });
  });
  it("respects the 20 h gap and skips anyone who practiced today", () => {
    expect(decide({ ...base, last_reminded_at: "2026-09-24T00:00:00Z" }, facts, now)).toMatchObject({ reason: "too_soon" });
    expect(decide({ ...base, last_reminded_at: "2026-09-23T00:00:00Z" }, facts, now)).toEqual({ send: true });
    expect(decide(base, { ...facts, lastAttemptAt: "2026-09-24T06:00:00Z" }, now)).toMatchObject({ reason: "practiced_today" });
  });
  it("pauses after three ignored reminders", () => {
    expect(decide(base, { ...facts, sendsSinceLastAttempt: 3 }, now)).toMatchObject({ reason: "pause" });
    expect(decide(base, { ...facts, sendsSinceLastAttempt: 2 }, now)).toEqual({ send: true });
  });
});

describe("weakest topic and copy", () => {
  it("needs three attempts and picks the lowest accuracy", () => {
    const a = (topic_id: string, correct: boolean) => ({ topic_id, correct });
    expect(weakestTopic([a("kinetics", false), a("kinetics", false)])).toBeNull();
    expect(weakestTopic([a("kinetics", true), a("kinetics", true), a("kinetics", false), a("redox", false), a("redox", false), a("redox", true)])).toBe("redox");
  });
  it("writes one plain line and both links", () => {
    const m = composeReminder({ due: 1, weakestTopicName: "Equilibrium", reviewUrl: "https://x/review", unsubscribeUrl: "https://x/u?t=1" });
    expect(m.subject).toBe("1 review due on Valence");
    expect(m.text).toContain("1 question is due for review. Weakest topic: Equilibrium.");
    expect(m.text).toContain("https://x/review");
    expect(m.html).toContain("https://x/u?t=1");
    expect(composeReminder({ due: 4, weakestTopicName: null, reviewUrl: "r", unsubscribeUrl: "u" }).subject).toBe("4 reviews due on Valence");
  });
});
