import { describe, it, expect } from "vitest";
import {
  extractBlockMap,
  injectBlockClasses,
  injectBlockLabels,
} from "@/lib/mjml/block-labels";

const SAMPLE_MJML = `<mjml>
  <mj-body>
    <!-- Block 1: Hero -->
    <mj-section background-color="#ffffff">
      <mj-column><mj-text>Hero</mj-text></mj-column>
    </mj-section>
    <!-- Block 2: Features -->
    <mj-section>
      <mj-column><mj-text>Features</mj-text></mj-column>
    </mj-section>
    <!-- Block 3: CTA -->
    <mj-section css-class="existing-class">
      <mj-column><mj-button>Click</mj-button></mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

describe("extractBlockMap", () => {
  it("extracts block numbers and names", () => {
    const map = extractBlockMap(SAMPLE_MJML);
    expect(map).toEqual({
      1: "Hero",
      2: "Features",
      3: "CTA",
    });
  });

  it("returns empty map for MJML without block comments", () => {
    const map = extractBlockMap("<mjml><mj-body><mj-section></mj-section></mj-body></mjml>");
    expect(map).toEqual({});
  });
});

describe("injectBlockClasses", () => {
  it("adds css-class to sections following block comments", () => {
    const result = injectBlockClasses(SAMPLE_MJML);
    expect(result).toContain('css-class="mb-block mb-block-1"');
    expect(result).toContain('css-class="mb-block mb-block-2"');
  });

  it("appends to existing css-class", () => {
    const result = injectBlockClasses(SAMPLE_MJML);
    expect(result).toContain('css-class="mb-block mb-block-3 existing-class"');
  });
});

describe("injectBlockLabels", () => {
  const HTML = `<!doctype html><html><head></head><body><!-- Block 1: Hero --><div>Hero</div><!-- Block 2: CTA --><div>CTA</div></body></html>`;

  it("injects inline label divs after block comments", () => {
    const result = injectBlockLabels(HTML, { 1: "Hero", 2: "CTA" });
    expect(result).toContain("1: Hero");
    expect(result).toContain("2: CTA");
    expect(result).toContain("rgba(99,102,241,0.9)");
  });

  it("extracts block map from HTML comments when blockMap is empty", () => {
    const result = injectBlockLabels(HTML, {});
    expect(result).toContain("1: Hero");
    expect(result).toContain("2: CTA");
  });

  it("returns unchanged HTML when no block comments and empty map", () => {
    const plain = `<!doctype html><html><body><div>No blocks</div></body></html>`;
    const result = injectBlockLabels(plain, {});
    expect(result).toBe(plain);
  });
});
