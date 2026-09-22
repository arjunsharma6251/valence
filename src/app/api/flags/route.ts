import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Flags from anonymous users. Signed-in users' flags arrive through /api/sync;
 * this endpoint lets anyone report a wrong or unclear question without an
 * account. Inserts use the anon key under an insert-only RLS policy.
 */
export async function POST(request: Request) {
  const sb = await supabaseServer();
  const body = (await request.json()) as {
    id: string;
    question_id: string;
    reason: string;
    note: string;
    anon_id: string;
  };
  if (!body?.question_id || !body?.reason) return NextResponse.json({ ok: false }, { status: 400 });
  if (!sb) return NextResponse.json({ ok: true, stored: "local" });
  const { error } = await sb.from("flags").upsert(
    { id: body.id, question_id: body.question_id, reason: body.reason, note: body.note ?? "", anon_id: body.anon_id, user_id: null },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, stored: "remote" });
}
