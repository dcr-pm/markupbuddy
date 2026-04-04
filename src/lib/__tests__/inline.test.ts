import { describe, it, expect } from "vitest";
import { inlineStyles } from "@/lib/email/inline";

describe("inlineStyles", () => {
  it("inlines CSS styles into HTML elements", () => {
    const html = `
      <html>
        <head><style>.red { color: red; }</style></head>
        <body><p class="red">Hello</p></body>
      </html>
    `;
    const result = inlineStyles(html);
    expect(result).toContain('style="color: red;"');
  });

  it("preserves media queries", () => {
    const html = `
      <html>
        <head><style>@media (max-width: 600px) { .mobile { display: block; } }</style></head>
        <body><p>Test</p></body>
      </html>
    `;
    const result = inlineStyles(html);
    expect(result).toContain("@media");
  });

  it("handles HTML with no styles gracefully", () => {
    const html = "<p>No styles here</p>";
    const result = inlineStyles(html);
    expect(result).toContain("No styles here");
  });
});
