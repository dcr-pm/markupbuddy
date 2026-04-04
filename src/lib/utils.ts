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

export function extractHtmlFromResponse(text: string): string | null {
  // Try closed fence first
  const closed = text.match(/```html\s*([\s\S]*?)```/);
  if (closed) return closed[1].trim();
  // Fallback: unclosed fence (streaming or truncated)
  const open = text.match(/```html\s*([\s\S]+)/);
  if (open) {
    const html = open[1].trim();
    if (html.length > 50) return html;
  }
  return null;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
