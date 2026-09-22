import { describe, expect, it } from "vitest";
import { frq } from "../content";
import { buildGradeContent, buildGradePrompt, cacheKey, estimateCostCents, imageMediaType, matchGradedPart, normalizeAnswer } from "../grading";

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

describe("photos", () => {
  it("cache key changes with attached images", () => {
    const a = cacheKey("seed-frq-01", { a: "pH 2.72" });
    const b = cacheKey("seed-frq-01", { a: "pH 2.72" }, ["/9j/abc"]);
    const c = cacheKey("seed-frq-01", { a: "pH 2.72" }, ["/9j/abd"]);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(cacheKey("seed-frq-01", { a: "pH 2.72" }, ["/9j/abc"])).toBe(b);
  });
  it("sniffs JPEG and PNG and rejects anything else", () => {
    expect(imageMediaType("/9j/4AAQ")).toBe("image/jpeg");
    expect(imageMediaType("iVBORw0KGgo")).toBe("image/png");
    expect(imageMediaType("R0lGODlh")).toBeNull();
    expect(imageMediaType("<script>")).toBeNull();
  });
  it("puts photos before the prompt and mentions them", () => {
    const blocks = buildGradeContent(frq[0], { a: "" }, ["/9j/abc", "nope"]);
    expect(blocks.map((b) => b.type)).toEqual(["image", "text"]);
    const text = blocks[1].type === "text" ? blocks[1].text : "";
    expect(text).toContain("1 photo");
  });
});
