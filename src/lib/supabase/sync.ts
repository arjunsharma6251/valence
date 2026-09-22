"use client";
/**
 * Sync layer between the local store and Supabase.
 *
 * - On start (and on sign-in): GET /api/sync → merge remote into local.
 * - On every local write (debounced 1.5s): POST /api/sync with the full
 *   local state; the server upserts by id, so re-sending is idempotent.
 * Without Supabase env vars, both are no-ops and the app is local-only.
 */
import { identifyUser, track } from "../analytics";
import { getState, mergeRemote, onChange, type UserState } from "../store";
import { supabaseBrowser } from "./client";

let timer: ReturnType<typeof setTimeout> | null = null;
let signedIn = false;

async function pull() {
  try {
    const res = await fetch("/api/sync", { method: "GET" });
    if (!res.ok) return;
    const remote = (await res.json()) as { state: UserState | null };
    if (remote.state) mergeRemote(remote.state);
    // Push the merged result back so the server has anything that was local-only.
    await push(getState());
  } catch {
    // Offline: local state is still authoritative on this device.
  }
}

async function push(state: UserState) {
  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state }),
      keepalive: true,
    });
  } catch {
    // Retry happens on the next write.
  }
}

export function startSync(): () => void {
  const sb = supabaseBrowser();
  if (!sb) return () => {};

  const unsubscribeStore = onChange((s) => {
    if (!signedIn) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => push(s), 1500);
  });

  const { data } = sb.auth.onAuthStateChange((event, session) => {
    const was = signedIn;
    signedIn = Boolean(session?.user);
    if (signedIn && session?.user) {
      identifyUser(session.user.id, { email: session.user.email ?? null });
      if (!was) {
        if (event === "SIGNED_IN") track("sign_in");
        void pull();
      }
    }
  });

  return () => {
    unsubscribeStore();
    data.subscription.unsubscribe();
  };
}
