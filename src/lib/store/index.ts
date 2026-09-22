"use client";
/**
 * A tiny external store: module-level state + subscribe + localStorage
 * persistence, read from React with useSyncExternalStore.
 *
 * Why not Context + useState? The state is written from many screens
 * (practice, mock, review, FRQ) and read by the home screen; an external
 * store avoids prop drilling and re-rendering the whole tree on each write.
 * `hydrated` is false during SSR and the first client render so server and
 * client markup match; screens show a skeleton until it flips.
 */
import { useSyncExternalStore } from "react";
import { emptyState, mergeStates, type UserState } from "./state";

const KEY = "valence.state.v1";
const MAX_ATTEMPTS = 5000;

let state: UserState = emptyState("server");
let hydrated = false;
const listeners = new Set<() => void>();
const syncListeners = new Set<(s: UserState) => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable (private mode). Practice still works in memory.
  }
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  let loaded: UserState | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) loaded = JSON.parse(raw) as UserState;
  } catch {
    loaded = null;
  }
  state = loaded && loaded.version === 1 ? { ...emptyState(loaded.anon_id), ...loaded } : emptyState(crypto.randomUUID());
  hydrated = true;
  persist();
  emit();
}

export function getState(): UserState {
  return state;
}
export function isHydrated(): boolean {
  return hydrated;
}

/** Apply an update. Returns the new state. Triggers persistence and sync. */
export function update(fn: (s: UserState) => UserState): UserState {
  state = fn(state);
  if (state.attempts.length > MAX_ATTEMPTS) {
    state = { ...state, attempts: state.attempts.slice(-MAX_ATTEMPTS) };
  }
  persist();
  emit();
  for (const l of syncListeners) l(state);
  return state;
}

/** Replace local state with a merge of local and remote (used on sign-in). */
export function mergeRemote(remote: UserState) {
  state = mergeStates(state, remote);
  persist();
  emit();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Register a callback that runs after every local write (used by the Supabase sync layer). */
export function onChange(l: (s: UserState) => void) {
  syncListeners.add(l);
  return () => {
    syncListeners.delete(l);
  };
}

const serverSnapshot = emptyState("server");

export function useStore<T>(selector: (s: UserState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(serverSnapshot),
  );
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

export type { UserState };
