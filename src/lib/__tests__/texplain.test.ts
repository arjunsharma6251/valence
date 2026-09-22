import { describe, expect, it } from "vitest";
import { texToPlain } from "../texplain";
import { questions } from "../content";

describe("texToPlain", () => {
  it("renders mhchem formulas with subscripts, charges and arrows", () => {
    expect(texToPlain("Water: $\\ce{2H2 + O2 -> 2H2O}$")).toBe("Water: 2H₂ + O₂ → 2H₂O");
    expect(texToPlain("$\\ce{Cu^2+ + 2e- -> Cu}$")).toBe("Cu²⁺ + 2e⁻ → Cu");
    expect(texToPlain("$\\ce{N2(g) + 3H2(g) <=> 2NH3(g)}$")).toBe("N₂(g) + 3H₂(g) ⇌ 2NH₃(g)");
  });
  it("renders common math", () => {
    expect(texToPlain("$K_\\text{sp} = 1.6 \\times 10^{-10}$")).toBe("Ksp = 1.6 × 10⁻¹⁰");
    expect(texToPlain("$\\Delta H^\\circ = -92\\ \\text{kJ/mol}$")).toBe("ΔH° = −92 kJ/mol");
  });
  it("never leaves a backslash or dollar sign in any bundled stem", () => {
    for (const q of questions) {
      const t = texToPlain(q.stem_md);
      expect(t, q.id).not.toMatch(/[\\$]/);
      expect(t.length).toBeGreaterThan(10);
    }
  });
});
