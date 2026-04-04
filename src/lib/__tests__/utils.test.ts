import { describe, it, expect } from "vitest";
import {
  extractHtmlFromResponse,
  generateId,
  formatDate,
  truncate,
} from "@/lib/utils";

describe("extractHtmlFromResponse", () => {
  it("extracts HTML from closed code fences", () => {
    const text = 'Here is your email:\n\n```html\n<div>Hello</div>\n```\n\nEnjoy!';
    expect(extractHtmlFromResponse(text)).toBe("<div>Hello</div>");
  });

  it("extracts HTML from unclosed code fences (streaming)", () => {
    const longHtml = '<table width="600" cellpadding="0" cellspacing="0"><tr><td>Welcome to our newsletter</td></tr></table>';
    const text = `Building your email:\n\n\`\`\`html\n${longHtml}`;
    expect(extractHtmlFromResponse(text)).toBe(longHtml);
  });

  it("returns null when no HTML fences exist", () => {
    expect(extractHtmlFromResponse("Just a regular message")).toBeNull();
  });

  it("returns null for very short unclosed HTML (< 50 chars)", () => {
    expect(extractHtmlFromResponse("```html\n<div>")).toBeNull();
  });

  it("prefers closed fence over unclosed", () => {
    const text = '```html\n<div>First</div>\n```\n\n```html\n<div>Second';
    expect(extractHtmlFromResponse(text)).toBe("<div>First</div>");
  });
});

describe("generateId", () => {
  it("returns a UUID string", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("returns unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2026-01-15T14:30:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date("2026-06-01T09:00:00Z"));
    expect(result).toContain("Jun");
  });
});

describe("truncate", () => {
  it("returns string as-is when shorter than limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  it("returns string as-is at exact limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});
