import { createHash } from "node:crypto";
import type { FrqProblem } from "./content/types";

/**
 * Pure helpers for the grader: cache-key normalization, the prompt, and the
 * cost estimate. Kept separate from the route so they can be unit-tested.
 */

/** Collapse whitespace/case so trivially different answers share a cache entry. */
export function normalizeAnswer(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
}

export function cacheKey(frqId: string, answers: Record<string, string>): string {
  const parts = Object.keys(answers)
    .sort()
    .map((k) => `${k}=${normalizeAnswer(answers[k] ?? "")}`)
    .join("|");
  return createHash("sha256").update(`${frqId}::${parts}`).digest("hex");
}

/** Price per million tokens, in cents. Extend when adding models. */
const PRICES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5": { in: 200, out: 1000 },
  "claude-opus-5": { in: 500, out: 2500 },
  "claude-haiku-4-5": { in: 100, out: 500 },
};

export function estimateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICES[model] ?? PRICES["claude-sonnet-5"];
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
}

export const GRADER_SYSTEM = `You grade free-response answers for a high-school chemistry olympiad (USNCO Part II). You are given a problem, and for each sub-part: the official key, a point rubric, and the student's typed answer.

Grade each sub-part strictly against its rubric:
- Award points only for criteria the student's answer actually satisfies. Partial credit only where the rubric line is partially met and says so or is clearly divisible.
- Accept equivalent forms (different but correct significant figures within reason, equivalent balanced equations, alternative correct methods). Do not penalize formatting, typos, or missing LaTeX.
- Numeric answers must be within about 2% of the key unless the rubric specifies otherwise; wrong units lose the units point only.
- If an answer is blank, award 0 and say "No answer given."
- "missing" names exactly which rubric criteria were not met, in one or two sentences a student can act on.
- "common_mistakes" names the specific misconception if the error matches a common one; otherwise leave it empty.
Keep all text short and plain. Do not restate the key; the student sees the model answer separately.`;

export function buildGradePrompt(problem: FrqProblem, answers: Record<string, string>): string {
  const parts = problem.parts
    .map((p) => {
      const rubric = p.rubric.map((r) => `  - (${r.points} pt) ${r.criterion}`).join("\n");
      return `### Part (${p.label}) — ${p.max_points} points
Question: ${p.stem_md}
Official key: ${p.key_md}
Rubric:
${rubric}
Student answer: ${answers[p.label]?.trim() ? answers[p.label] : "(blank)"}`;
    })
    .join("\n\n");
  return `# ${problem.title}\n${problem.intro_md}\n\n${parts}`;
}
