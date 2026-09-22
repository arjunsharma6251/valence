/**
 * User state. Lives in localStorage for everyone (anonymous users get a
 * generated id) and is mirrored to Supabase when signed in. Everything
 * here is a log or a keyed map so two copies can be merged by union.
 */
import type { Level, OptionLabel } from "../content/types";
import type { Attempt } from "../mastery";
import type { MockSession } from "../mock";
import type { Card } from "../srs";

export interface Profile {
  grade_year: string | null; // "9" | "10" | "11" | "12" | "other"
  target: Level | null;
  /** Leaderboard name; null = not shown. */
  display_name?: string | null;
  /** Opt-in to the public weekly leaderboard. */
  public?: boolean;
}

export interface Flag {
  id: string;
  question_id: string;
  reason: "wrong_answer" | "unclear" | "typo" | "other";
  note: string;
  created_at: string;
}

export interface FrqGradeLine {
  label: string;
  points: number;
  max_points: number;
  missing: string;
  common_mistakes: string;
}

export interface FrqSubmission {
  id: string;
  frq_id: string;
  answers: Record<string, string>; // part label → answer text
  grade: {
    total: number;
    max_total: number;
    parts: FrqGradeLine[];
    overall_feedback: string;
  } | null;
  model: string | null;
  created_at: string;
}

export interface UserState {
  version: 1;
  anon_id: string;
  profile: Profile;
  attempts: Attempt[];
  cards: Record<string, Card>;
  mocks: MockSession[];
  flags: Flag[];
  frq_submissions: FrqSubmission[];
  /** Ids shown recently in Practice, newest last; keeps selection from repeating. */
  recent_ids: string[];
  /** Unsent FRQ drafts so a failed grade never loses typed text. */
  frq_drafts: Record<string, Record<string, string>>;
  theme: "system" | "light" | "dark";
}

export function emptyState(anonId: string): UserState {
  return {
    version: 1,
    anon_id: anonId,
    profile: { grade_year: null, target: null },
    attempts: [],
    cards: {},
    mocks: [],
    flags: [],
    frq_submissions: [],
    recent_ids: [],
    frq_drafts: {},
    theme: "system",
  };
}

export type { Attempt, Card, MockSession, OptionLabel };

/** Union-merge two states. Newer wins for keyed records; logs are unioned by id. */
export function mergeStates(a: UserState, b: UserState): UserState {
  const byId = <T extends { id: string }>(xs: T[], ys: T[]) => {
    const m = new Map<string, T>();
    for (const x of [...xs, ...ys]) m.set(x.id, x);
    return [...m.values()];
  };
  const cards: Record<string, Card> = { ...a.cards };
  for (const [k, c] of Object.entries(b.cards)) {
    if (!cards[k] || cards[k].updated_at < c.updated_at) cards[k] = c;
  }
  const mocks = byId(a.mocks, b.mocks).sort((x, y) => x.started_at.localeCompare(y.started_at));
  return {
    ...a,
    profile: {
      grade_year: b.profile.grade_year ?? a.profile.grade_year,
      target: b.profile.target ?? a.profile.target,
      display_name: b.profile.display_name ?? a.profile.display_name ?? null,
      public: b.profile.public ?? a.profile.public ?? false,
    },
    attempts: byId(a.attempts, b.attempts).sort((x, y) => x.created_at.localeCompare(y.created_at)),
    cards,
    mocks,
    flags: byId(a.flags, b.flags),
    frq_submissions: byId(a.frq_submissions, b.frq_submissions).sort((x, y) =>
      x.created_at.localeCompare(y.created_at),
    ),
    recent_ids: a.recent_ids,
    frq_drafts: { ...b.frq_drafts, ...a.frq_drafts },
    theme: a.theme,
  };
}
