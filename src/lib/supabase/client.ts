"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfigured } from "./env";

/** Browser client. Returns null when Supabase is not configured (anonymous-only mode). */
export function supabaseBrowser() {
  if (!supabaseConfigured()) return null;
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
