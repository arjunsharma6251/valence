import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getFrq } from "@/lib/content";
import { GRADER_SYSTEM, buildGradePrompt, cacheKey, estimateCostCents } from "@/lib/grading";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/grade — grade a Part II submission.
 *
 * Cost controls (scope R7):
 *   - per-subject daily cap (user id, else anon id, and IP): GRADING_DAILY_CAP, default 5
 *   - hard monthly spend cap: GRADING_MONTHLY_CAP_CENTS, default 4000 ($40) → "paused"
 *   - cache keyed on normalized answer text per problem
 * Bookkeeping lives in grading_ledger / frq_submissions via the service role
 * when Supabase is configured; otherwise in process memory (dev only).
 */

export const maxDuration = 30;

const GradeSchema = z.object({
  parts: z.array(
    z.object({
      label: z.string(),
      points: z.number(),
      missing: z.string(),
      common_mistakes: z.string(),
    }),
  ),
  overall_feedback: z.string(),
});

const DAILY_CAP = Number(process.env.GRADING_DAILY_CAP ?? 5);
const MONTHLY_CAP_CENTS = Number(process.env.GRADING_MONTHLY_CAP_CENTS ?? 4000);
const MODEL = process.env.GRADER_MODEL ?? "claude-sonnet-5";

// ---- bookkeeping backends --------------------------------------------------

interface Ledger {
  countToday(subjects: string[]): Promise<number>;
  monthSpendCents(): Promise<number>;
  cached(key: string): Promise<unknown | null>;
  record(input: { subjects: string[]; frq_id: string; cost_cents: number; cache_key: string; grade: unknown; answers: Record<string, string>; user_id: string | null; anon_id: string | null; model: string }): Promise<void>;
}

const mem = { ledger: [] as { subject: string; at: number; cost: number }[], cache: new Map<string, unknown>() };

const memoryLedger: Ledger = {
  async countToday(subjects) {
    const since = Date.now() - 86_400_000;
    return Math.max(...subjects.map((s) => mem.ledger.filter((l) => l.subject === s && l.at > since).length), 0);
  },
  async monthSpendCents() {
    const since = Date.now() - 30 * 86_400_000;
    return mem.ledger.filter((l) => l.at > since).reduce((s, l) => s + l.cost, 0);
  },
  async cached(key) {
    return mem.cache.get(key) ?? null;
  },
  async record({ subjects, cost_cents, cache_key, grade }) {
    for (const s of subjects) mem.ledger.push({ subject: s, at: Date.now(), cost: cost_cents / subjects.length });
    mem.cache.set(cache_key, grade);
  },
};

function serviceLedger(): Ledger | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  return {
    async countToday(subjects) {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const counts = await Promise.all(
        subjects.map(async (s) => {
          const { count } = await sb.from("grading_ledger").select("id", { count: "exact", head: true }).eq("subject", s).gt("created_at", since);
          return count ?? 0;
        }),
      );
      return Math.max(...counts, 0);
    },
    async monthSpendCents() {
      const start = new Date();
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      const { data } = await sb.from("grading_ledger").select("cost_cents").gt("created_at", start.toISOString());
      return (data ?? []).reduce((s, r) => s + Number(r.cost_cents), 0);
    },
    async cached(key) {
      const { data } = await sb.from("frq_submissions").select("grade").eq("cache_key", key).not("grade", "is", null).limit(1).maybeSingle();
      return data?.grade ?? null;
    },
    async record({ subjects, frq_id, cost_cents, cache_key, grade, answers, user_id, anon_id, model }) {
      await Promise.all([
        sb.from("grading_ledger").insert(subjects.map((subject) => ({ subject, frq_id, cost_cents: cost_cents / subjects.length }))),
        sb.from("frq_submissions").insert({ id: crypto.randomUUID(), user_id, anon_id, frq_id, answers, grade, model, cost_cents, cache_key }),
      ]);
    },
  };
}

// ---- handler ---------------------------------------------------------------

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, reason: "not_configured", message: "Grading is not set up on this server yet." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { frq_id?: string; answers?: Record<string, string>; anon_id?: string } | null;
  const problem = body?.frq_id ? getFrq(body.frq_id) : undefined;
  if (!problem || !body?.answers) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const answers: Record<string, string> = {};
  for (const p of problem.parts) answers[p.label] = String(body.answers[p.label] ?? "").slice(0, 4000);
  if (Object.values(answers).every((a) => !a.trim())) {
    return NextResponse.json({ ok: false, reason: "empty", message: "Write an answer to at least one part first." }, { status: 400 });
  }

  let userId: string | null = null;
  if (supabaseConfigured()) {
    const sb = await supabaseServer();
    const { data } = await sb!.auth.getUser();
    userId = data.user?.id ?? null;
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
  const subjects = userId ? [`user:${userId}`] : [`anon:${body.anon_id ?? "none"}`, `ip:${ip}`];
  const ledger = serviceLedger() ?? memoryLedger;

  const key = cacheKey(problem.id, answers);
  const cached = await ledger.cached(key);
  if (cached) return NextResponse.json({ ok: true, grade: cached, model: MODEL, cached: true });

  if ((await ledger.monthSpendCents()) >= MONTHLY_CAP_CENTS) {
    return NextResponse.json({ ok: false, reason: "paused", message: "Grading is paused for the rest of the month to keep Valence free. Your answer is saved on this device." }, { status: 503 });
  }
  if ((await ledger.countToday(subjects)) >= DAILY_CAP) {
    return NextResponse.json({ ok: false, reason: "daily_cap", message: `You've used today's ${DAILY_CAP} graded submissions. The model answer is still below; try again tomorrow.` }, { status: 429 });
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: [{ type: "text", text: GRADER_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildGradePrompt(problem, answers) }],
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(GradeSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ ok: false, reason: "model", message: "The grader couldn't produce a grade. Try again." }, { status: 502 });
    }
    const raw = response.parsed_output;
    const parts = problem.parts.map((p) => {
      const g = raw.parts.find((x) => x.label === p.label);
      const points = Math.max(0, Math.min(p.max_points, Math.round((g?.points ?? 0) * 2) / 2));
      return { label: p.label, points, max_points: p.max_points, missing: g?.missing ?? "", common_mistakes: g?.common_mistakes ?? "" };
    });
    const grade = {
      total: parts.reduce((s, p) => s + p.points, 0),
      max_total: parts.reduce((s, p) => s + p.max_points, 0),
      parts,
      overall_feedback: raw.overall_feedback,
    };
    const cost = estimateCostCents(MODEL, response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) * 0.1, response.usage.output_tokens);
    await ledger.record({ subjects, frq_id: problem.id, cost_cents: cost, cache_key: key, grade, answers, user_id: userId, anon_id: body.anon_id ?? null, model: MODEL });
    return NextResponse.json({ ok: true, grade, model: MODEL, cached: false });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ ok: false, reason: "busy", message: "The grader is busy. Try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return NextResponse.json({ ok: false, reason: "network", message: "Couldn't reach the grader. Check your connection and retry." }, { status: 502 });
    }
    const message = err instanceof Anthropic.APIError ? err.message : "Unexpected error while grading.";
    return NextResponse.json({ ok: false, reason: "error", message }, { status: 500 });
  }
}
