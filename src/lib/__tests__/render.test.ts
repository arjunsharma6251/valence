import { describe, expect, it } from "vitest";
import { renderMd } from "../render";

describe("renderMd", () => {
  it("escapes html and renders emphasis", () => {
    expect(renderMd("a <b> **bold** *it*")).toBe("<p>a &lt;b&gt; <strong>bold</strong> <em>it</em></p>");
  });
  it("renders inline math with mhchem", () => {
    const html = renderMd("Water is $\\ce{H2O}$.");
    expect(html).toContain("katex");
    expect(html).not.toContain("katex-error");
  });
  it("renders display math and paragraphs and lists", () => {
    const html = renderMd("Line 1\n\n$$K = \\frac{[B]}{[A]}$$\n\n- one\n- two");
    expect(html).toContain("katex-display");
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
  });
  it("keeps escaped dollar signs literal", () => {
    expect(renderMd("costs \\$5")).toBe("<p>costs $5</p>");
  });
});
