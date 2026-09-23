/**
 * Outbound email through Resend's REST API (no SDK). Every message carries
 * one-click unsubscribe headers so mail clients show their own "Unsubscribe"
 * control next to the sender.
 */
export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl: string;
}

export const EMAIL_FROM = process.env.REMINDER_FROM ?? "Valence <reminders@usevalence.app>";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Sends up to 100 messages in one request; returns Resend ids in order (null where it failed). */
export async function sendBatch(messages: OutboundEmail[]): Promise<(string | null)[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key || messages.length === 0) return messages.map(() => null);
  const body = messages.map((m) => ({
    from: EMAIL_FROM,
    to: [m.to],
    subject: m.subject,
    text: m.text,
    html: m.html,
    headers: { "List-Unsubscribe": `<${m.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  }));
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { data?: { id: string }[] };
  return messages.map((_, i) => data.data?.[i]?.id ?? null);
}
