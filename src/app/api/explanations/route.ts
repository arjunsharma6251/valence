import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { explanationSchema } from "@/lib/content/schema";

/**
 * Contributor editor. Allowlisted, signed-in users (CONTRIBUTOR_EMAILS env
 * var, comma-separated) can save an edited explanation and mark it verified.
 * Every save is a new row in explanation_edits, so history is kept; the
 * latest row per question overrides the bundled explanation at read time.
 */
function isContributor(email: string | undefined | null): boolean {
  const list = (process.env.CONTRIBUTOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && list.includes(email.toLowerCase()));
}

export async function GET(request: Request) {
  const questionId = new URL(request.url).searchParams.get("question_id");
  const sb = await supabaseServer();
  if (!sb || !questionId) return NextResponse.json({ override: null, can_edit: false });
  const [{ data: auth }, { data }] = await Promise.all([
    sb.auth.getUser(),
    sb
      .from("explanation_edits")
      .select("question_id,body_md,distractor_notes,concept_ref,verified,author,updated_at")
      .eq("question_id", questionId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return NextResponse.json({ override: data ?? null, can_edit: isContributor(auth.user?.email) });
}

export async function POST(request: Request) {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || !isContributor(auth.user.email)) return NextResponse.json({ ok: false }, { status: 403 });

  const parsed = explanationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  const e = parsed.data;
  const { error } = await sb.from("explanation_edits").insert({
    question_id: e.question_id,
    body_md: e.body_md,
    distractor_notes: e.distractor_notes,
    concept_ref: e.concept_ref,
    verified: e.verified,
    author: auth.user.email,
    author_id: auth.user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
