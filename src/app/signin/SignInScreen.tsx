"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Button, Card, Eyebrow, Pill } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { setProfile } from "@/lib/store/actions";
import { useStore } from "@/lib/store";
import { resetAnalytics, track } from "@/lib/analytics";

/**
 * Sign in with Google or a magic link. Anonymous use works fully; signing in
 * merges this device’s history with the account (see lib/supabase/sync).
 * Profile has exactly two fields: grade year and target exam.
 */
export function SignInScreen() {
  const sb = supabaseBrowser();
  const params = useSearchParams();
  const profile = useStore((s) => s.profile);
  const attempts = useStore((s) => s.attempts.length);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(params.get("error") ? "Sign-in link failed or expired. Try again." : null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const google = async () => {
    if (!sb) return;
    setBusy(true);
    track("sign_up", { method: "google" });
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
  };
  const magic = async () => {
    if (!sb || !email) return;
    setBusy(true);
    setErr(null);
    track("sign_up", { method: "magic_link" });
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };
  const signOut = async () => {
    await sb?.auth.signOut();
    resetAnalytics();
    setUser(null);
  };

  return (
    <div className="space-y-5">
      <header className="animate-rise">
        <h1 className="text-[24px] font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-[15px] text-muted leading-relaxed">Everything works without an account. Sign in to keep progress across devices; this device’s {attempts} answers merge in.</p>
      </header>

      {!sb ? (
        <Card><p className="text-[15px] text-muted">Accounts aren’t enabled on this deployment yet. Progress stays on this device.</p></Card>
      ) : user ? (
        <Card className="animate-rise [animation-delay:60ms] flex items-center gap-3">
          <div className="flex-1">
            <Eyebrow>Signed in</Eyebrow>
            <p className="mt-0.5 text-[15px]">{user.email}</p>
          </div>
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        </Card>
      ) : (
        <Card className="animate-rise [animation-delay:60ms] space-y-3">
          <Button onClick={google} disabled={busy} className="w-full">Continue with Google</Button>
          <div className="flex items-center gap-2 text-[12px] text-faint"><span className="flex-1 h-px bg-line" />or<span className="flex-1 h-px bg-line" /></div>
          {sent ? (
            <p className="text-[15px]">Check {email} for a sign-in link.</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); magic(); }} className="flex gap-2">
              <label className="sr-only" htmlFor="email">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.org" className="flex-1 min-h-11 rounded-full border border-line bg-bg px-4 text-[15px]" />
              <Button type="submit" variant="secondary" disabled={busy}>Email link</Button>
            </form>
          )}
          {err && <p className="text-[13px] text-bad">{err}</p>}
        </Card>
      )}

      <Card className="animate-rise [animation-delay:120ms] space-y-3">
        <Eyebrow>Profile</Eyebrow>
        <div>
          <p className="text-[13px] text-muted mb-1.5">Target exam</p>
          <div className="flex gap-2">
            {(["local", "national"] as const).map((t) => (
              <Button key={t} variant={profile.target === t ? "primary" : "secondary"} onClick={() => setProfile({ target: t })}>{t === "local" ? "Local" : "National"}</Button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[13px] text-muted mb-1.5">Grade</p>
          <div className="flex flex-wrap gap-2">
            {["9", "10", "11", "12", "other"].map((g) => (
              <Button key={g} variant={profile.grade_year === g ? "primary" : "secondary"} className="min-h-10 px-4" onClick={() => setProfile({ grade_year: g })}>{g}</Button>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-faint">That’s all we ask. <Pill tone="neutral">no other data</Pill></p>
      </Card>
    </div>
  );
}
