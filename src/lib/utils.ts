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
 * Check if HTML looks complete (not truncated mid-tag).
 */
export function isHtmlComplete(html: string): boolean {
  // Must end with a closing tag or whitespace after one
  const trimmed = html.trim();
  if (trimmed.length < 50) return false;
  // Check for obvious truncation: ends mid-tag, mid-attribute, or mid-style
  if (trimmed.match(/<[^>]*$/)) return false; // ends inside an opening tag
  if (trimmed.match(/style\s*=\s*"[^"]*$/)) return false; // ends mid-style attr
  if (trimmed.match(/<!--[\s\S]*$/)) {
    // Check if comment is closed
    const lastComment = trimmed.lastIndexOf("<!--");
    const afterComment = trimmed.slice(lastComment);
    if (!afterComment.includes("-->")) return false;
  }
  return true;
}

/**
 * Extract MJML or HTML from AI response.
 * Prefers the LAST match (most recent/updated version).
 * MJML responses are returned as-is (compiled server-side).
 */
export function extractHtmlFromResponse(text: string): string | null {
  // Try MJML fences first (closed)
  const mjmlMatches = [...text.matchAll(/```(?:mjml|xml)\s*([\s\S]*?)```/g)];
  if (mjmlMatches.length > 0) {
    const lastMjml = mjmlMatches[mjmlMatches.length - 1][1].trim();
    if (lastMjml.includes("<mjml") || lastMjml.includes("<mj-")) {
      return lastMjml;
    }
  }

  // Try HTML fences (closed) — use LAST match
  const htmlMatches = [...text.matchAll(/```html\s*([\s\S]*?)```/g)];
  if (htmlMatches.length > 0) {
    return htmlMatches[htmlMatches.length - 1][1].trim();
  }

  // Fallback: unclosed fence (streaming) — MJML or HTML
  const openFence = text.match(/```(?:mjml|xml|html)\s*([\s\S]+)/);
  if (openFence) {
    const content = openFence[1].trim();
    if (content.length > 50) return content;
  }

  return null;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
