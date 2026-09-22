import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { emptyState, type UserState } from "@/lib/store/state";

/**
 * GET  → the signed-in user's state assembled from the per-user tables.
 * POST → upsert the posted state. Row-level security scopes every table to
 *        auth.uid(), so the handler never filters by user itself.
 */
export async function GET() {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ state: null });
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ state: null }, { status: 401 });

  const [profile, attempts, cards, mocks, flags, frq] = await Promise.all([
    sb.from("profiles").select("grade_year,target").eq("id", user.id).maybeSingle(),
    sb.from("attempts").select("id,question_id,topic_id,chosen,correct,ms_taken,context,created_at"),
    sb.from("srs_cards").select("question_id,interval,ease,reps,due_at,updated_at"),
    sb.from("mock_sessions").select("id,level,question_ids,answers,started_at,duration_s,paused_at,pauses_used,submitted_at,score"),
    sb.from("flags").select("id,question_id,reason,note,created_at"),
    sb.from("frq_submissions").select("id,frq_id,answers,grade,model,created_at"),
  ]);

  const state: UserState = {
    ...emptyState(user.id),
    profile: { grade_year: profile.data?.grade_year ?? null, target: profile.data?.target ?? null },
    attempts: (attempts.data ?? []) as UserState["attempts"],
    cards: Object.fromEntries(((cards.data ?? []) as UserState["cards"][string][]).map((c) => [c.question_id, c])),
    mocks: (mocks.data ?? []) as UserState["mocks"],
    flags: (flags.data ?? []) as UserState["flags"],
    frq_submissions: (frq.data ?? []) as UserState["frq_submissions"],
  };
  return NextResponse.json({ state });
}

export async function POST(request: Request) {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json()) as { state?: UserState };
  const s = body.state;
  if (!s || s.version !== 1) return NextResponse.json({ ok: false, reason: "bad_state" }, { status: 400 });

  const uid = user.id;
  const results = await Promise.all([
    sb.from("profiles").upsert({ id: uid, grade_year: s.profile.grade_year, target: s.profile.target }),
    s.attempts.length
      ? sb.from("attempts").upsert(s.attempts.map((a) => ({ ...a, user_id: uid })), { onConflict: "id", ignoreDuplicates: true })
      : null,
    Object.keys(s.cards).length
      ? sb.from("srs_cards").upsert(Object.values(s.cards).map((c) => ({ ...c, user_id: uid })), { onConflict: "user_id,question_id" })
      : null,
    s.mocks.length ? sb.from("mock_sessions").upsert(s.mocks.map((m) => ({ ...m, user_id: uid })), { onConflict: "id" }) : null,
    s.flags.length ? sb.from("flags").upsert(s.flags.map((f) => ({ ...f, user_id: uid })), { onConflict: "id", ignoreDuplicates: true }) : null,
    s.frq_submissions.length
      ? sb.from("frq_submissions").upsert(s.frq_submissions.map((f) => ({ ...f, user_id: uid })), { onConflict: "id", ignoreDuplicates: true })
      : null,
  ]);
  const errors = results.filter((r) => r && r.error).map((r) => r!.error!.message);
  if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 500 });
  return NextResponse.json({ ok: true });
}
