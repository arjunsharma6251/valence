import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * One-click unsubscribe from review reminders. The token is the only
 * credential, so this works from any device without signing in. GET is the
 * link in the email body; POST is what mail clients send for the
 * List-Unsubscribe-Post header.
 */
async function unsubscribe(token: string | null): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !token || !/^[0-9a-f-]{36}$/i.test(token)) return false;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error, count } = await sb.from("profiles").update({ reminders_enabled: false }, { count: "exact" }).eq("unsubscribe_token", token);
  return !error && (count ?? 0) > 0;
}

export async function GET(request: Request) {
  const ok = await unsubscribe(new URL(request.url).searchParams.get("t"));
  return NextResponse.redirect(new URL(ok ? "/unsubscribed" : "/unsubscribed?error=1", request.url), 303);
}

export async function POST(request: Request) {
  const ok = await unsubscribe(new URL(request.url).searchParams.get("t"));
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
