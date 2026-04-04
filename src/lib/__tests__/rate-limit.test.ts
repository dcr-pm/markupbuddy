import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows the first request", () => {
    const result = checkRateLimit("test-user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it("allows multiple requests up to the limit", () => {
    const userId = "test-user-2";
    for (let i = 0; i < 19; i++) {
      checkRateLimit(userId);
    }
    const last = checkRateLimit(userId);
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);
  });

  it("blocks requests after the limit is exceeded", () => {
    const userId = "test-user-3";
    for (let i = 0; i < 20; i++) {
      checkRateLimit(userId);
    }
    const blocked = checkRateLimit(userId);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("isolates rate limits per user", () => {
    const result = checkRateLimit("test-user-4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
  });
});
