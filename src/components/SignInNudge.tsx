"use client";
import { useEffect, useState } from "react";
import { Button, LinkButton } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { snooze, useSnoozed } from "@/lib/flags";
import { track } from "@/lib/analytics";

const KEY = "valence.nudge.signin";
const SNOOZE_MS = 7 * 86_400_000;
const AFTER_ANSWERS = 2;

/**
 * A small, dismissable card that appears once a visitor has answered a couple
 * of questions and is not signed in: the moment there is something worth
 * keeping. "Not now" hides it for a week on this device; signing in ends it.
 */
export function SignInNudge({ answered }: { answered: number }) {
  const sb = supabaseBrowser();
  const snoozed = useSnoozed(KEY);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
  }, [sb]);

  const open = Boolean(sb) && signedIn === false && answered >= AFTER_ANSWERS && !snoozed;

  useEffect(() => {
    if (open) track("sign_in_nudge_shown", { answered });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per appearance
  }, [open]);

  if (!open) return null;
  const dismiss = () => {
    snooze(KEY, SNOOZE_MS);
    track("sign_in_nudge_dismissed", { answered });
  };
  return (
    <aside
      role="status"
      className="fixed z-30 inset-x-4 bottom-[calc(56px+env(safe-area-inset-bottom)+12px)] md:inset-x-auto md:right-6 md:bottom-6 md:w-[400px] bg-canvas border border-line rounded-[6px] shadow-soft p-4 animate-rise"
    >
      <p className="serif text-[20px] leading-tight tracking-[-0.01em]">Keep this progress.</p>
      <p className="mt-1.5 text-[14px] text-ink-soft leading-relaxed">Sign in to sync it across devices and appear on the leaderboard. Google or email, ten seconds.</p>
      <div className="mt-3 flex items-center gap-3">
        <span onClick={() => track("sign_in_nudge_clicked", { answered })} className="contents">
          <LinkButton href="/signin" size="compact">Sign in</LinkButton>
        </span>
        <Button variant="plain" size="compact" onClick={dismiss}>Not now</Button>
      </div>
    </aside>
  );
}
