"use client";
import { useSyncExternalStore } from "react";

/**
 * Per-device conveniences (a dismissed prompt, a snooze) kept in localStorage
 * and read through useSyncExternalStore so render stays pure. Storage can be
 * missing or throw in private windows; reads then fall back to `fallback`.
 */
const listeners = new Map<string, Set<() => void>>();

export function readFlag(key: string, fallback = ""): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeFlag(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
  for (const l of listeners.get(key) ?? []) l();
}

export function useFlag(key: string, fallback = ""): string {
  return useSyncExternalStore(
    (l) => {
      const set = listeners.get(key) ?? new Set();
      set.add(l);
      listeners.set(key, set);
      return () => set.delete(l);
    },
    () => readFlag(key, fallback),
    () => fallback,
  );
}

/** True while a snooze written with `snooze(key, ms)` is still in effect. */
export function useSnoozed(key: string): boolean {
  return useSyncExternalStore(
    (l) => {
      const set = listeners.get(key) ?? new Set();
      set.add(l);
      listeners.set(key, set);
      return () => set.delete(l);
    },
    () => Number(readFlag(key, "0")) > Date.now(),
    () => true,
  );
}

export function snooze(key: string, ms: number) {
  writeFlag(key, String(Date.now() + ms));
}
