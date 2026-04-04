import { URL } from "url";

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
  "169.254.",
];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOSTS.some(
    (blocked) => hostname === blocked || hostname.startsWith(blocked)
  );
}

export async function scrapeUrl(
  url: string
): Promise<{ html: string; title: string }> {
  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  if (isBlockedHost(parsed.hostname)) {
    throw new Error("Cannot scrape private or local addresses");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MarkupBuddy/1.0; +https://markupbuddy.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsed.hostname;

    // Extract body content if it exists
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[0] : html;

    return { html: bodyHtml, title };
  } finally {
    clearTimeout(timeout);
  }
}
