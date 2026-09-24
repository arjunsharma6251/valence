"use client";
import { useEffect, useState } from "react";
import { Button, LinkButton } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { snooze, useSessionFlag, useSnoozed, writeSessionFlag } from "@/lib/flags";
import { useStore } from "@/lib/store";
import { useSkills } from "@/lib/store/derived";
import { track } from "@/lib/analytics";

export type NudgeContext = "practice" | "mock" | "prediction" | "challenge";

const SNOOZE_MS: Record<NudgeContext, number> = { practice: 7 * 86_400_000, mock: 7 * 86_400_000, prediction: 30 * 86_400_000, challenge: 7 * 86_400_000 };
const SESSION_KEY = "valence.nudge.asked";

/**
 * A small, dismissable card asking for sign-in at an earned moment: after a
 * couple of practice answers, on a mock score, when the prediction unlocks,
 * or after answering a friend's challenge. The copy names what the account
 * would keep. At most one ask per tab session; "Not now" snoozes that
 * context on this device; signing in ends it everywhere.
 */
export function SignInNudge({ context, show = true, score }: { context: NudgeContext; show?: boolean; score?: { correct: number; total: number } }) {
  const sb = supabaseBrowser();
  const attempts = useStore((s) => s.attempts);
  const skills = useSkills();
  const snoozed = useSnoozed(`valence.nudge.${context}`);
  const askedThisSession = useSessionFlag(SESSION_KEY);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
  }, [sb]);

  // One ask per tab session: the first context to become eligible writes its
  // name to the session flag and stays; any other context sees a foreign name.
  const eligible = Boolean(sb) && show && signedIn === false && !snoozed && (askedThisSession === "" || askedThisSession === context);
  useEffect(() => {
    if (!eligible || askedThisSession === context) return;
    writeSessionFlag(SESSION_KEY, context);
    track("sign_in_nudge_shown", { context, answered: attempts.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when it first becomes eligible
  }, [eligible]);

  if (!eligible) return null;
  const rated = Object.values(skills).filter((s) => s.attempts > 0).length;
  const copy = {
    practice: {
      title: `Keep your ${attempts.length} answer${attempts.length === 1 ? "" : "s"}${rated ? ` and ${rated} topic rating${rated === 1 ? "" : "s"}` : ""}.`,
      body: "Sign in to sync across devices and get a note when reviews are due. Google or email, ten seconds.",
    },
    mock: {
      title: score ? `Save this ${score.correct}/${score.total} to your account.` : "Save this mock to your account.",
      body: "Sign in to keep every mock, sync across devices and get a note when reviews are due.",
    },
    prediction: {
      title: "Your predicted score is ready. Keep it.",
      body: "Sign in so it follows you across devices and updates from every answer.",
    },
    challenge: {
      title: "Beat them next time.",
      body: "Sign in to keep score across devices and challenge friends back.",
    },
  }[context];
  const dismiss = () => {
    snooze(`valence.nudge.${context}`, SNOOZE_MS[context]);
    track("sign_in_nudge_dismissed", { context, answered: attempts.length });
  };
  return (
    <aside
      role="status"
      className="fixed z-30 inset-x-4 bottom-[calc(56px+env(safe-area-inset-bottom)+12px)] md:inset-x-auto md:right-6 md:bottom-6 md:w-[400px] bg-canvas border border-line rounded-[6px] shadow-soft p-4 animate-rise"
    >
      <p className="serif text-[20px] leading-tight tracking-[-0.01em]">{copy.title}</p>
      <p className="mt-1.5 text-[14px] text-ink-soft leading-relaxed">{copy.body}</p>
      <div className="mt-3 flex items-center gap-3">
        <span onClick={() => track("sign_in_nudge_clicked", { context, answered: attempts.length })} className="contents">
          <LinkButton href="/signin" size="compact">Sign in</LinkButton>
        </span>
        <Button variant="plain" size="compact" onClick={dismiss}>Not now</Button>
      </div>
    </aside>
  );
}
