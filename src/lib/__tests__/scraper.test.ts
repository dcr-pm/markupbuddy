import { describe, it, expect } from "vitest";

// We can't import scrapeUrl directly since it uses Node's URL and fetch,
// but we can test the SSRF protection logic by extracting it.
// Instead, test the isBlockedHost logic inline.

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

describe("SSRF protection", () => {
  it("blocks localhost", () => {
    expect(isBlockedHost("localhost")).toBe(true);
  });

  it("blocks 127.0.0.1", () => {
    expect(isBlockedHost("127.0.0.1")).toBe(true);
  });

  it("blocks private 10.x addresses", () => {
    expect(isBlockedHost("10.0.0.1")).toBe(true);
    expect(isBlockedHost("10.255.255.255")).toBe(true);
  });

  it("blocks private 192.168.x addresses", () => {
    expect(isBlockedHost("192.168.1.1")).toBe(true);
  });

  it("blocks private 172.16-31.x addresses", () => {
    expect(isBlockedHost("172.16.0.1")).toBe(true);
    expect(isBlockedHost("172.31.255.255")).toBe(true);
  });

  it("blocks link-local addresses", () => {
    expect(isBlockedHost("169.254.1.1")).toBe(true);
  });

  it("allows public addresses", () => {
    expect(isBlockedHost("google.com")).toBe(false);
    expect(isBlockedHost("8.8.8.8")).toBe(false);
    expect(isBlockedHost("example.com")).toBe(false);
  });

  it("blocks IPv6 loopback", () => {
    expect(isBlockedHost("::1")).toBe(true);
  });
});
