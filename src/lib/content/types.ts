/**
 * Content types — the shape of everything under /content.
 *
 * Content is public, static, and versioned in git. It is produced by the
 * Python pipeline in /pipeline and imported at build time, so the app works
 * offline and without a database. User data (attempts, skill, SRS, mocks,
 * FRQ submissions) lives elsewhere — see src/lib/store.
 *
 * Text fields ending in `_md` use "mini-markdown" (see src/lib/render):
 *   - `$...$` inline math, `$$...$$` display math (KaTeX + mhchem, so `\ce{H2O}` works)
 *   - `**bold**`, `*italic*`, `` `code` ``
 *   - blank line = paragraph break; lines starting with `- ` = bullet list
 *   - `^` and `_` outside math are literal; use math for sub/superscripts
 */

export type Level = "local" | "national";
export type OptionLabel = "A" | "B" | "C" | "D";

export interface Topic {
  id: string; // slug, e.g. "equilibrium"
  name: string; // display name
  acs_category: string; // official ACS category name
  /** Approximate number of questions on a 60-question local exam. */
  local_weight: number;
  /** Approximate number of questions on the 60-question national Part I. */
  national_weight: number;
  /** Position of this topic's block of six on the official exam (1–10). */
  block?: number;
  /** Question numbers that block covers on the official exam, e.g. "7–12". */
  questions?: string;
  subtopics: string[];
}

export interface QuestionOption {
  label: OptionLabel;
  text_md: string;
}

export interface Question {
  /** Stable id: `${year}-${L|N}-${number}` for real exams, `seed-...` for originals. */
  id: string;
  year: number;
  level: Level;
  number: number;
  stem_md: string;
  figure_url: string | null;
  topic_id: string;
  subtopic: string;
  /**
   * Estimated fraction of students who answer correctly (0–1).
   * Seeded from ACS-published percent-correct where available, otherwise
   * an author estimate. Converted to an Elo-style rating in src/lib/mastery.
   */
  est_percent_correct: number;
  /** Official ACS percent of national qualifiers who answered correctly (0–1), when published. */
  field_percent_correct?: number | null;
  correct_option: OptionLabel;
  options: QuestionOption[];
  /** The official one-line ACS solution, if published. */
  acs_solution_md: string | null;
  /** Attribution shown under every question. */
  source: string;
  /** True once a human has confirmed the correct answer. */
  verified_answer: boolean;
}

export interface Explanation {
  question_id: string;
  /** Step-by-step explanation. */
  body_md: string;
  /** One line per option on why it is wrong; the correct option's entry says why it is right. */
  distractor_notes: Record<OptionLabel, string>;
  /** Short name of the underlying concept, used as the link target label. */
  concept_ref: string;
  verified: boolean;
  author: string;
  updated_at: string; // ISO date
}

export interface RubricLine {
  points: number;
  criterion: string;
}

export interface FrqPart {
  /** e.g. "a", "b", "c(i)" */
  label: string;
  stem_md: string;
  /** Official (or model) answer for this part. */
  key_md: string;
  rubric: RubricLine[];
  max_points: number;
  /** Cropped exam figure this part depends on, under /figures. */
  figure_url?: string | null;
}

export interface FrqProblem {
  /** `${year}-N-P${number}`. */
  id: string;
  year: number;
  level: "national";
  number: number;
  title: string;
  topic_id: string;
  /** Shared context shown above all parts. */
  intro_md: string;
  /** Cropped exam figure shared by the whole problem, under /figures. */
  figure_url?: string | null;
  parts: FrqPart[];
  source: string;
}

export interface ContentBundle {
  topics: Topic[];
  questions: Question[];
  explanations: Explanation[];
  frq: FrqProblem[];
}
