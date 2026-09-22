"use client";
import { useEffect } from "react";
import { hydrate, useStore, useHydrated } from "@/lib/store";
import { initAnalytics } from "@/lib/analytics";
import { startSync } from "@/lib/supabase/sync";

/**
 * Client bootstrap: hydrate the store from localStorage, apply the theme,
 * start analytics, and start the Supabase sync layer (no-op without env).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const theme = useStore((s) => s.theme);
  const anonId = useStore((s) => s.anon_id);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const el = document.documentElement;
    if (theme === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    initAnalytics(anonId);
    return startSync();
  }, [hydrated, anonId]);

  return <>{children}</>;
}
