import { describe, expect, it } from "vitest";
import { explanations, frq, questions, topics } from "../content";
import { explanationSchema, frqProblemSchema, questionSchema } from "../content/schema";
import { renderMd } from "../render";

const topicIds = new Set(topics.map((t) => t.id));

describe("content bundle", () => {
  it("every question validates and has a unique id", () => {
    const ids = new Set<string>();
    for (const q of questions) {
      const r = questionSchema.safeParse(q);
      expect(r.success, `${q.id}: ${r.success ? "" : r.error.message}`).toBe(true);
      expect(ids.has(q.id), `duplicate id ${q.id}`).toBe(false);
      ids.add(q.id);
      expect(topicIds.has(q.topic_id), `${q.id} unknown topic ${q.topic_id}`).toBe(true);
      expect(q.options.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
      expect(q.verified_answer).toBe(true);
    }
  });

  it("every seed question has an explanation with four distractor notes; every explanation points at a question", () => {
    const byQ = new Map(explanations.map((e) => [e.question_id, e]));
    const ids = new Set(questions.map((q) => q.id));
    for (const q of questions.filter((q) => q.id.startsWith("seed-"))) {
      const e = byQ.get(q.id);
      expect(e, `${q.id} has no explanation`).toBeDefined();
      expect(explanationSchema.safeParse(e).success).toBe(true);
      for (const l of ["A", "B", "C", "D"] as const) expect(e!.distractor_notes[l].length, `${q.id} note ${l}`).toBeGreaterThan(0);
    }
    for (const e of explanations) expect(ids.has(e.question_id), `${e.question_id} explanation is orphaned`).toBe(true);
  });

  it("FRQ rubrics sum to max points", () => {
    for (const p of frq) {
      expect(frqProblemSchema.safeParse(p).success).toBe(true);
      expect(topicIds.has(p.topic_id)).toBe(true);
      for (const part of p.parts) {
        const sum = part.rubric.reduce((s, r) => s + r.points, 0);
        expect(sum, `${p.id} part ${part.label}`).toBe(part.max_points);
      }
    }
  });

  it("all markdown renders without KaTeX error markup", () => {
    const texts = [
      ...questions.flatMap((q) => [q.stem_md, ...q.options.map((o) => o.text_md)]),
      ...explanations.flatMap((e) => [e.body_md, ...Object.values(e.distractor_notes)]),
      ...frq.flatMap((p) => [p.intro_md, ...p.parts.flatMap((x) => [x.stem_md, x.key_md])]),
    ];
    for (const t of texts) {
      const html = renderMd(t);
      expect(html, t).not.toContain("katex-error");
    }
  });
});
