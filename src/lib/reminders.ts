/**
 * Pure decision and copy logic for review reminders. The cron route gathers
 * rows; this decides who gets an email and what it says, so it can be tested
 * without a database.
 */
export const MIN_GAP_MS = 20 * 3_600_000; // never two reminders within 20 h
export const RECENT_PRACTICE_MS = 12 * 3_600_000; // practiced today: no nudge
export const IGNORED_BEFORE_PAUSE = 3; // reminders with no practice in between

export interface ReminderCandidate {
  user_id: string;
  email: string | null;
  reminders_enabled: boolean;
  reminders_paused_at: string | null;
  last_reminded_at: string | null;
  unsubscribe_token: string;
}

export interface ReminderFacts {
  due: number;
  weakestTopic: string | null;
  lastAttemptAt: string | null;
  /** Reminders sent after the user's last attempt (or ever, if none). */
  sendsSinceLastAttempt: number;
}

export type Decision = { send: true } | { send: false; reason: "disabled" | "paused" | "no_email" | "nothing_due" | "too_soon" | "practiced_today" | "pause" };

export function decide(c: ReminderCandidate, f: ReminderFacts, now: number): Decision {
  if (!c.reminders_enabled) return { send: false, reason: "disabled" };
  if (c.reminders_paused_at) return { send: false, reason: "paused" };
  if (!c.email) return { send: false, reason: "no_email" };
  if (f.sendsSinceLastAttempt >= IGNORED_BEFORE_PAUSE) return { send: false, reason: "pause" };
  if (f.due < 1) return { send: false, reason: "nothing_due" };
  if (c.last_reminded_at && now - Date.parse(c.last_reminded_at) < MIN_GAP_MS) return { send: false, reason: "too_soon" };
  if (f.lastAttemptAt && now - Date.parse(f.lastAttemptAt) < RECENT_PRACTICE_MS) return { send: false, reason: "practiced_today" };
  return { send: true };
}

/** Lowest accuracy among topics with at least three attempts; null if none qualify. */
export function weakestTopic(attempts: { topic_id: string; correct: boolean }[]): string | null {
  const by = new Map<string, { n: number; c: number }>();
  for (const a of attempts) {
    const t = by.get(a.topic_id) ?? { n: 0, c: 0 };
    t.n += 1;
    t.c += a.correct ? 1 : 0;
    by.set(a.topic_id, t);
  }
  let best: { id: string; acc: number } | null = null;
  for (const [id, t] of by) {
    if (t.n < 3) continue;
    const acc = t.c / t.n;
    if (!best || acc < best.acc) best = { id, acc };
  }
  return best?.id ?? null;
}

export function composeReminder(input: { due: number; weakestTopicName: string | null; reviewUrl: string; unsubscribeUrl: string }) {
  const n = input.due;
  const subject = n === 1 ? "1 review due on Valence" : `${n} reviews due on Valence`;
  const line = `${n === 1 ? "1 question is" : `${n} questions are`} due for review${input.weakestTopicName ? `. Weakest topic: ${input.weakestTopicName}` : ""}.`;
  const text = `${line}\nOpen the Review tab on Valence to clear it, or use the link below.\n\n${input.reviewUrl}\n\nYou get this when reviews are due. Stop anytime:\n${input.unsubscribeUrl}\n`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#faf8f5;color:#151311;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif">
<p style="margin:0 0 16px">${escapeHtml(line)}</p>
<p style="margin:0 0 28px"><a href="${input.reviewUrl}" style="display:inline-block;padding:10px 16px;background:#151311;color:#faf8f5;text-decoration:none;border-radius:4px">Review now</a></p>
<p style="margin:0;font-size:13px;color:#6b6763">You get this when reviews are due. <a href="${input.unsubscribeUrl}" style="color:#1d4ed8">Stop these emails</a> with one click.</p>
</body></html>`;
  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
