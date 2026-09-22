"use client";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Button, LinkButton } from "@/components/ui";
import { questions } from "@/lib/content";
import { useHydrated, useStore } from "@/lib/store";
import { track } from "@/lib/analytics";

const KEY = "valence.welcomed";
const listeners = new Set<() => void>();

function readSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true; // storage unavailable: never nag
  }
}
function markSeen() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const serverSnapshot = () => true;

/**
 * One-time welcome for a first visit: what this is, in three lines, and a
 * way in. Shown only when there is no local history at all, dismissed for
 * good on any action, Escape, or the backdrop. Never shown again on this
 * device. The "seen" flag is an external store so render stays pure.
 */
export function Welcome() {
  const hydrated = useHydrated();
  const attempts = useStore((s) => s.attempts);
  const seen = useSyncExternalStore(subscribe, readSeen, serverSnapshot);
  const open = hydrated && attempts.length === 0 && !seen;
  const dialog = useRef<HTMLDivElement | null>(null);

  const dismiss = (how: string) => {
    markSeen();
    track("welcome_dismissed", { how });
  };

  useEffect(() => {
    if (!open) return;
    track("welcome_shown");
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { markSeen(); track("welcome_dismissed", { how: "escape" }); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 sm:p-6" role="presentation" onClick={() => dismiss("backdrop")}>
      <div className="absolute inset-0 bg-ink/30 animate-fade" aria-hidden="true" />
      <div
        ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[480px] bg-canvas border border-line rounded-[6px] shadow-soft p-6 sm:p-7 animate-rise outline-none"
      >
        <p className="mono">Welcome</p>
        <h2 id="welcome-title" className="serif text-[28px] leading-none tracking-[-0.01em] mt-3">Every USNCO exam, in one place.</h2>
        <ol className="mt-5 space-y-3 text-[15px] leading-relaxed">
          <li className="flex gap-3"><span className="mono shrink-0 w-6">01</span><span>{questions.filter((q) => !q.id.startsWith("seed-")).length.toLocaleString()} past questions, with figures, from every local and national exam since 2016.</span></li>
          <li className="flex gap-3"><span className="mono shrink-0 w-6">02</span><span>Practice adapts to what you miss, and a review queue brings it back.</span></li>
          <li className="flex gap-3"><span className="mono shrink-0 w-6">03</span><span>Part II free response graded against the official key, typed or photographed.</span></li>
        </ol>
        <div className="mt-6 flex items-center gap-3">
          <span onClick={() => dismiss("practice")} className="contents">
            <LinkButton href="/practice" size="compact">Start practicing</LinkButton>
          </span>
          <Link href="/about" onClick={() => dismiss("about")} className="text-accent text-[15px] min-h-[36px] inline-flex items-center whitespace-nowrap">What Valence does</Link>
          <Button variant="plain" size="compact" onClick={() => dismiss("close")} className="ml-auto" aria-label="Close">Not now</Button>
        </div>
        <p className="mt-4 text-[13px] text-ink-soft">Free. No account needed; your progress stays on this device until you sign in.</p>
      </div>
    </div>
  );
}
