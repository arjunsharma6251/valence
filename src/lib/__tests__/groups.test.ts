import { describe, expect, it } from "vitest";
import { generateGroupCode, normalizeGroupCode } from "../groups";

describe("group codes", () => {
  it("generates six unambiguous characters", () => {
    const c = generateGroupCode(() => 0.5);
    expect(c).toMatch(/^[A-Z0-9]{6}$/);
    for (let i = 0; i < 200; i++) expect(generateGroupCode()).not.toMatch(/[01IO]/);
  });
  it("normalizes user input", () => {
    expect(normalizeGroupCode(" ab-c 2d3 ")).toBe("ABC2D3");
    expect(normalizeGroupCode("abc")).toBeNull();
  });
});
