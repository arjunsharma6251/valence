import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generateGroupCode, normalizeGroupCode, type GroupView } from "@/lib/groups";

/**
 * Study groups.
 *   GET  → the caller's groups with per-member aggregates
 *   POST { action: "create", name, display_name } | { action: "join", code, display_name } | { action: "leave", group_id }
 * Everything is scoped by RLS plus the security-definer functions in
 * supabase/migrations/0002_groups.sql; the route never sees raw attempts.
 */
async function loadGroups(sb: NonNullable<Awaited<ReturnType<typeof supabaseServer>>>): Promise<GroupView[]> {
  const { data: groups } = await sb.from("study_groups").select("id,code,name").order("created_at");
  const out: GroupView[] = [];
  for (const g of groups ?? []) {
    const { data: members } = await sb.rpc("group_summary", { p_group: g.id });
    out.push({ ...g, members: (members ?? []) as GroupView["members"] });
  }
  return out;
}

export async function GET() {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ groups: [], enabled: false });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ groups: [], enabled: true, signed_in: false });
  return NextResponse.json({ groups: await loadGroups(sb), enabled: true, signed_in: true });
}

export async function POST(request: Request) {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, reason: "signed_out" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; name?: string; code?: string; display_name?: string; group_id?: string };
  const displayName = (body.display_name ?? auth.user.email?.split("@")[0] ?? "Member").trim().slice(0, 24) || "Member";

  if (body.action === "create") {
    const name = (body.name ?? "").trim().slice(0, 40);
    if (!name) return NextResponse.json({ ok: false, reason: "name_required" }, { status: 400 });
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateGroupCode();
      const { data, error } = await sb.from("study_groups").insert({ code, name, created_by: auth.user.id }).select("id").single();
      if (error?.code === "23505") continue; // code collision, try again
      if (error || !data) return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
      const { error: mErr } = await sb.from("study_group_members").insert({ group_id: data.id, user_id: auth.user.id, display_name: displayName });
      if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, code, groups: await loadGroups(sb) });
    }
    return NextResponse.json({ ok: false, reason: "code_collision" }, { status: 500 });
  }
  if (body.action === "join") {
    const code = normalizeGroupCode(body.code ?? "");
    if (!code) return NextResponse.json({ ok: false, reason: "bad_code", message: "Codes are 6 letters and numbers." }, { status: 400 });
    const { error } = await sb.rpc("join_group", { p_code: code, p_name: displayName });
    if (error) return NextResponse.json({ ok: false, reason: "no_such_group", message: "No group with that code." }, { status: 404 });
    return NextResponse.json({ ok: true, groups: await loadGroups(sb) });
  }
  if (body.action === "leave" && body.group_id) {
    await sb.from("study_group_members").delete().eq("group_id", body.group_id).eq("user_id", auth.user.id);
    return NextResponse.json({ ok: true, groups: await loadGroups(sb) });
  }
  return NextResponse.json({ ok: false, reason: "bad_action" }, { status: 400 });
}
