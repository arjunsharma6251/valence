import { describe, expect, it } from "vitest";
import { frq } from "../content";
import { buildGradePrompt, cacheKey, estimateCostCents, matchGradedPart, normalizeAnswer } from "../grading";

describe("grading helpers", () => {
  it("cache key ignores whitespace and case", () => {
    const a = cacheKey("p", { a: "pH = 4.74", b: "" });
    const b = cacheKey("p", { b: "", a: "  ph  =  4.74 " });
    expect(a).toBe(b);
    expect(cacheKey("p", { a: "pH = 4.75" })).not.toBe(a);
  });
  it("normalizes quotes", () => {
    expect(normalizeAnswer("“x”")).toBe('"x"');
  });
  it("prompt includes every part, rubric and the student answer", () => {
    const p = frq[0];
    const text = buildGradePrompt(p, { [p.parts[0].label]: "my answer" });
    for (const part of p.parts) expect(text).toContain(`Part (${part.label})`);
    expect(text).toContain("my answer");
    expect(text).toContain("(blank)");
  });
  it("cost estimate uses per-model prices", () => {
    expect(estimateCostCents("claude-sonnet-5", 1_000_000, 0)).toBe(200);
    expect(estimateCostCents("claude-sonnet-5", 0, 1000)).toBe(1);
  });
});

describe("matchGradedPart", () => {
  const parts = [{ label: "a" }, { label: "b" }, { label: "e(i)" }];
  it("matches exact, parenthesized and prefixed labels", () => {
    const graded = [{ label: "(a)", points: 1 }, { label: "Part b", points: 2 }, { label: "E (i)", points: 3 }];
    expect(matchGradedPart(graded, parts, 0)?.points).toBe(1);
    expect(matchGradedPart(graded, parts, 1)?.points).toBe(2);
    expect(matchGradedPart(graded, parts, 2)?.points).toBe(3);
  });
  it("falls back to position only when the counts agree", () => {
    expect(matchGradedPart([{ label: "x" }, { label: "y" }, { label: "z" }], parts, 1)?.label).toBe("y");
    expect(matchGradedPart([{ label: "x" }], parts, 1)).toBeUndefined();
  });
});
