import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Repair common HTML issues from AI-generated email output.
 * Fixes orphaned text from broken tags, unclosed tags, etc.
 */
export function repairEmailHtml(html: string): string {
  let repaired = html;

  // Fix orphaned attribute text that appears outside tags
  // e.g., `center;">` appearing as visible text between tags
  repaired = repaired.replace(/>([^<]*?)(\w+(?:=["'][^"']*["'])?\s*;?\s*["']?>)/g, (match, between, orphan) => {
    // Only fix if the "between" text looks like leaked attributes (short, has ;/"/= chars)
    if (orphan.length < 80 && /[;="']/.test(orphan) && !/\w{4,}/.test(between.trim())) {
      return `>${between.trim()}`;
    }
    return match;
  });

  // Remove standalone attribute-like text between tags (e.g., center;"> or style="...">)
  repaired = repaired.replace(/>\s*(?:center|left|right|middle|top|bottom)\s*;?\s*"?\s*>/g, '>');

  // Fix double >> which can happen from broken tags
  repaired = repaired.replace(/>(\s*)>/g, '>');

  return repaired;
}

export function extractHtmlFromResponse(text: string): string | null {
  // Try closed fence first
  const closed = text.match(/```html\s*([\s\S]*?)```/);
  if (closed) return repairEmailHtml(closed[1].trim());
  // Fallback: unclosed fence (streaming or truncated)
  const open = text.match(/```html\s*([\s\S]+)/);
  if (open) {
    const html = open[1].trim();
    if (html.length > 50) return repairEmailHtml(html);
  }
  return null;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
