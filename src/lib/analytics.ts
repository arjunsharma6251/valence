"use client";
/**
 * Analytics — PostHog behind a tiny facade so screens call `track("...")`
 * and never import PostHog directly. Without NEXT_PUBLIC_POSTHOG_KEY every
 * call is a no-op, so local development sends nothing.
 *
 * What is captured automatically once the key is set:
 *   - page views and page leaves (with time on page), referrer, device
 *   - session replay (watch real users navigate; set
 *     NEXT_PUBLIC_POSTHOG_REPLAY=true — off by default, and typed FRQ
 *     answers are masked)
 * Plus the named events below, which are the ones the success-metrics
 * table in the scope is built from.
 */
import posthog from "posthog-js";

export type EventName =
  | "session_start"
  | "question_answered"
  | "practice_started"
  | "mock_started"
  | "mock_completed"
  | "review_started"
  | "frq_submitted"
  | "frq_grade_failed"
  | "explanation_flagged"
  | "explanation_expanded"
  | "sign_up"
  | "sign_in"
  | "theme_changed";

let ready = false;

export function initAnalytics(anonId: string) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || ready || typeof window === "undefined") return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    disable_session_recording: process.env.NEXT_PUBLIC_POSTHOG_REPLAY !== "true",
    session_recording: { maskAllInputs: true, maskTextSelector: "textarea" },
    autocapture: false,
  });
  posthog.identify(anonId);
  ready = true;
  track("session_start");
}

export function track(event: EventName, props: Record<string, string | number | boolean | null> = {}) {
  if (!ready) return;
  posthog.capture(event, props);
}

/** Link the anonymous id to the signed-in user so pre-signup history counts. */
export function identifyUser(userId: string, props: Record<string, string | null> = {}) {
  if (!ready) return;
  posthog.identify(userId, props);
}

export function resetAnalytics() {
  if (!ready) return;
  posthog.reset();
}
