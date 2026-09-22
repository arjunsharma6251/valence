import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Public weekly leaderboard: opted-in users only, aggregates only. Cached for a minute. */
export const revalidate = 60;

export async function GET() {
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ rows: [], enabled: false });
  const { data, error } = await sb.rpc("leaderboard_week");
  if (error) return NextResponse.json({ rows: [], enabled: true, error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [], enabled: true, week_start: weekStart() });
}

function weekStart() {
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
