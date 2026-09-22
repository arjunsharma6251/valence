"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Button, Group, GroupFooter, GroupHeader, LargeTitle, Row, Segmented, Narrow } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GroupsPanel } from "@/components/GroupsPanel";
import { supabaseBrowser } from "@/lib/supabase/client";
import { setProfile } from "@/lib/store/actions";
import { useStore } from "@/lib/store";
import { resetAnalytics, track } from "@/lib/analytics";

/** Account: Google or magic link; anonymous use works fully. Profile is two fields. */
export function SignInScreen() {
  const sb = supabaseBrowser();
  const params = useSearchParams();
  const profile = useStore((s) => s.profile);
  const attempts = useStore((s) => s.attempts.length);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const joinCode = params.get("join");
  const [err, setErr] = useState<string | null>(params.get("error") ? "That sign-in link failed or expired. Try again." : null);

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
  const signOut = async () => { await sb?.auth.signOut(); resetAnalytics(); setUser(null); };

  return (
    <Narrow className="stagger">
      <LargeTitle className="pt-1 pb-4">Account</LargeTitle>

      {!sb ? (
        <Group><Row title="Accounts aren’t enabled here yet" detail="Progress stays on this device." /></Group>
      ) : user ? (
        <Group>
          <Row title={user.email ?? "Signed in"} detail="Progress syncs across your devices">
            <Button variant="tinted" size="compact" onClick={signOut}>Sign out</Button>
          </Row>
        </Group>
      ) : (
        <>
          {joinCode && (
            <Group className="mb-3"><Row title={`Sign in to join group ${joinCode}`} detail="Your progress on this device merges into the account." /></Group>
          )}
          <Group>
            <div className="px-4 py-3 space-y-2">
              <Button onClick={google} disabled={busy} className="w-full">Continue with Google</Button>
              {sent ? (
                <p className="text-body py-2">Check {email} for a sign-in link.</p>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); magic(); }} className="flex gap-2">
                  <label className="sr-only" htmlFor="email">Email</label>
                  <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.org" className="flex-1 min-h-[50px] rounded-[var(--radius-control)] bg-fill/70 px-4 text-body focus:bg-group focus:ring-2 focus:ring-accent outline-none" />
                  <Button type="submit" variant="tinted" disabled={busy}>Email link</Button>
                </form>
              )}
              {err && <p className="text-footnote text-red" role="alert">{err}</p>}
            </div>
          </Group>
          <GroupFooter>Everything works without an account. Sign in to keep progress across devices; this device’s {attempts} answers merge in.</GroupFooter>
        </>
      )}

      {sb && <GroupsPanel signedIn={Boolean(user)} />}

      <GroupHeader>Profile</GroupHeader>
      <Group>
        <Row title="Target exam">
          <Segmented label="Target exam" value={profile.target ?? "local"} onChange={(v) => setProfile({ target: v })} options={[{ value: "local", label: "Local" }, { value: "national", label: "National" }]} />
        </Row>
        <Row title="Grade">
          <Segmented label="Grade" value={profile.grade_year ?? ""} onChange={(v) => setProfile({ grade_year: v })} options={["9", "10", "11", "12"].map((g) => ({ value: g, label: g }))} />
        </Row>
      </Group>
      <GroupFooter>That’s all we ask for.</GroupFooter>

      <GroupHeader>Appearance</GroupHeader>
      <Group>
        <Row title="Theme"><ThemeToggle /></Row>
      </Group>
    </Narrow>
  );
}
