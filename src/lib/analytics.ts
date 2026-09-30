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
  | "theme_changed"
  | "share"
  | "welcome_shown"
  | "welcome_dismissed"
  | "sign_in_nudge_shown"
  | "sign_in_nudge_clicked"
  | "sign_in_nudge_dismissed"
  | "reminders_on"
  | "reminders_off"
  | "challenge_opened"
  | "group_created"
  | "group_joined"
  | "leaderboard_optin";

let ready = false;
/**
 * Events fired before init. React runs child effects before parent effects, so
 * a component that tracks on mount (the welcome dialog did) would otherwise be
 * dropped, because `initAnalytics` runs in a provider above it. Queue and flush.
 */
const pending: { event: EventName; props: Record<string, string | number | boolean | null> }[] = [];
const MAX_PENDING = 50;

export function initAnalytics(anonId: string) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || ready || typeof window === "undefined") return;
  // Local development never reports, unless explicitly asked to, so the
  // dashboards only ever contain real visitors.
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  if (local && process.env.NEXT_PUBLIC_POSTHOG_DEV !== "true") return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    // The app routes client-side, so page views must also fire on history
    // changes or every path except the landing page is undercounted.
    capture_pageview: "history_change",
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    disable_session_recording: process.env.NEXT_PUBLIC_POSTHOG_REPLAY !== "true",
    session_recording: { maskAllInputs: true, maskTextSelector: "textarea" },
    autocapture: false,
  });
  posthog.identify(anonId);
  ready = true;
  for (const p of pending.splice(0)) posthog.capture(p.event, p.props);
  track("session_start");
}

export function track(event: EventName, props: Record<string, string | number | boolean | null> = {}) {
  if (!ready) {
    if (pending.length < MAX_PENDING) pending.push({ event, props });
    return;
  }
  posthog.capture(event, props);
}

/**
 * Milestones at which we stamp the running answer count onto the person, so
 * PostHog surveys and cohorts can target "has actually used this" without a
 * request on every single answer.
 */
const ANSWER_MILESTONES = [1, 2, 5, 10, 25, 50, 100];

export function recordAnswerCount(total: number) {
  if (!ready || !ANSWER_MILESTONES.includes(total)) return;
  posthog.setPersonProperties({ answers_total: total });
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
