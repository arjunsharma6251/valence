import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTopic } from "@/lib/content";
import { emailConfigured, sendBatch, type OutboundEmail } from "@/lib/email";
import { composeReminder, decide, weakestTopic, type ReminderCandidate } from "@/lib/reminders";

/**
 * Daily review reminders (Vercel Cron, see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; nothing else may call this.
 * Decides per user with the pure rules in lib/reminders and logs every send.
 */
export const maxDuration = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.usevalence.app";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  if (!emailConfigured()) return NextResponse.json({ ok: false, reason: "no_email_provider" }, { status: 503 });

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const since30d = new Date(now - 30 * 86_400_000).toISOString();

  // 1. Who could get one: enabled, not paused.
  const { data: profiles, error: pErr } = await sb
    .from("profiles")
    .select("id,reminders_enabled,reminders_paused_at,last_reminded_at,unsubscribe_token")
    .eq("reminders_enabled", true)
    .is("reminders_paused_at", null);
  if (pErr) return NextResponse.json({ ok: false, reason: "db", message: pErr.message }, { status: 500 });
  const ids = (profiles ?? []).map((p) => p.id as string);
  if (ids.length === 0) return NextResponse.json({ ok: true, considered: 0, sent: 0 });

  // 2. Emails come from auth, which the service role can page through.
  const emails = new Map<string, string>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data.users.length) break;
    for (const u of data.users) if (u.email) emails.set(u.id, u.email);
    if (data.users.length < 1000) break;
  }

  // 3. Facts: due cards, recent attempts (weakest topic + practiced today), recent sends.
  const [{ data: due }, { data: attempts }, { data: sends }] = await Promise.all([
    sb.from("srs_cards").select("user_id").in("user_id", ids).lte("due_at", nowIso),
    sb.from("attempts").select("user_id,topic_id,correct,created_at").in("user_id", ids).gte("created_at", since30d),
    sb.from("reminder_sends").select("user_id,sent_at").in("user_id", ids).gte("sent_at", since30d),
  ]);
  const dueBy = new Map<string, number>();
  for (const r of due ?? []) dueBy.set(r.user_id, (dueBy.get(r.user_id) ?? 0) + 1);
  const attemptsBy = new Map<string, { topic_id: string; correct: boolean; created_at: string }[]>();
  for (const a of attempts ?? []) attemptsBy.set(a.user_id, [...(attemptsBy.get(a.user_id) ?? []), a]);
  const sendsBy = new Map<string, string[]>();
  for (const s of sends ?? []) sendsBy.set(s.user_id, [...(sendsBy.get(s.user_id) ?? []), s.sent_at]);

  // 4. Decide.
  const outbound: { candidate: ReminderCandidate; due: number; topic: string | null; email: OutboundEmail }[] = [];
  const toPause: string[] = [];
  const reasons: Record<string, number> = {};
  for (const p of profiles ?? []) {
    const candidate: ReminderCandidate = { user_id: p.id, email: emails.get(p.id) ?? null, reminders_enabled: p.reminders_enabled, reminders_paused_at: p.reminders_paused_at, last_reminded_at: p.last_reminded_at, unsubscribe_token: p.unsubscribe_token };
    const mine = attemptsBy.get(p.id) ?? [];
    const lastAttemptAt = mine.reduce<string | null>((m, a) => (!m || a.created_at > m ? a.created_at : m), null);
    const sendsSince = (sendsBy.get(p.id) ?? []).filter((t) => !lastAttemptAt || t > lastAttemptAt).length;
    const topic = weakestTopic(mine);
    const facts = { due: dueBy.get(p.id) ?? 0, weakestTopic: topic, lastAttemptAt, sendsSinceLastAttempt: sendsSince };
    const d = decide(candidate, facts, now);
    if (!d.send) {
      reasons[d.reason] = (reasons[d.reason] ?? 0) + 1;
      if (d.reason === "pause") toPause.push(p.id);
      continue;
    }
    const unsubscribeUrl = `${SITE}/api/unsubscribe?t=${candidate.unsubscribe_token}`;
    const msg = composeReminder({ due: facts.due, weakestTopicName: topic ? getTopic(topic)?.name ?? null : null, reviewUrl: `${SITE}/review?from=email`, unsubscribeUrl });
    outbound.push({ candidate, due: facts.due, topic, email: { to: candidate.email!, unsubscribeUrl, ...msg } });
  }

  // Dry run (?dry=1): report what would go out, send nothing, change nothing.
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  if (dry) {
    const preview = outbound.map((o) => ({ user: o.candidate.user_id, to: o.email.to.replace(/^(.).*(@.*)$/, "$1…$2"), due: o.due, topic: o.topic, subject: o.email.subject }));
    return NextResponse.json({ ok: true, dry: true, considered: ids.length, wouldSend: preview.length, wouldPause: toPause.length, skipped: reasons, preview });
  }

  // 5. Send in batches of 100, log, stamp.
  let sent = 0;
  for (let i = 0; i < outbound.length; i += 100) {
    const chunk = outbound.slice(i, i + 100);
    const resendIds = await sendBatch(chunk.map((o) => o.email));
    const ok = chunk.map((o, j) => ({ o, id: resendIds[j] })).filter((x): x is { o: (typeof chunk)[number]; id: string } => Boolean(x.id));
    if (ok.length) {
      await Promise.all([
        sb.from("reminder_sends").insert(ok.map(({ o, id }) => ({ user_id: o.candidate.user_id, due_count: o.due, weakest_topic: o.topic, resend_id: id, sent_at: nowIso }))),
        sb.from("profiles").update({ last_reminded_at: nowIso }).in("id", ok.map(({ o }) => o.candidate.user_id)),
      ]);
      sent += ok.length;
    }
  }
  if (toPause.length) await sb.from("profiles").update({ reminders_paused_at: nowIso }).in("id", toPause);

  return NextResponse.json({ ok: true, considered: ids.length, sent, paused: toPause.length, skipped: reasons });
}
