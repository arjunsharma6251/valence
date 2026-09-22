/**
 * Zod schemas for content files. Used by the content test and by the
 * contributor editor to validate edits before saving.
 */
import { z } from "zod";

export const optionLabel = z.enum(["A", "B", "C", "D"]);

export const questionSchema = z.object({
  id: z.string().min(1),
  year: z.number().int().min(1990).max(2100),
  level: z.enum(["local", "national"]),
  number: z.number().int().min(1),
  stem_md: z.string().min(1),
  figure_url: z.string().nullable(),
  topic_id: z.string().min(1),
  subtopic: z.string(),
  est_percent_correct: z.number().min(0.01).max(0.99),
  correct_option: optionLabel,
  options: z
    .array(z.object({ label: optionLabel, text_md: z.string().min(1) }))
    .length(4),
  acs_solution_md: z.string().nullable(),
  source: z.string().min(1),
  verified_answer: z.boolean(),
});

export const explanationSchema = z.object({
  question_id: z.string().min(1),
  body_md: z.string().min(1),
  distractor_notes: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }),
  concept_ref: z.string(),
  verified: z.boolean(),
  author: z.string(),
  updated_at: z.string(),
});

export const frqProblemSchema = z.object({
  id: z.string().min(1),
  year: z.number().int(),
  level: z.literal("national"),
  number: z.number().int(),
  title: z.string().min(1),
  topic_id: z.string().min(1),
  intro_md: z.string(),
  figure_url: z.string().nullable().optional(),
  parts: z
    .array(
      z.object({
        label: z.string().min(1),
        stem_md: z.string().min(1),
        key_md: z.string().min(1),
        rubric: z
          .array(z.object({ points: z.number().positive(), criterion: z.string().min(1) }))
          .min(1),
        max_points: z.number().positive(),
        figure_url: z.string().nullable().optional(),
      }),
    )
    .min(1),
  source: z.string().min(1),
});
