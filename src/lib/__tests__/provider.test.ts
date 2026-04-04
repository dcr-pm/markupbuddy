import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getActiveProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear env
    delete process.env.AI_PROVIDER;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  it("returns gemini when AI_PROVIDER=gemini and key exists", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    const { getActiveProvider } = await import("@/lib/ai/provider");
    expect(getActiveProvider()).toBe("gemini");
  });

  it("returns anthropic when AI_PROVIDER=anthropic and key exists", async () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { getActiveProvider } = await import("@/lib/ai/provider");
    expect(getActiveProvider()).toBe("anthropic");
  });

  it("auto-detects gemini when only GEMINI_API_KEY is set", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const { getActiveProvider } = await import("@/lib/ai/provider");
    expect(getActiveProvider()).toBe("gemini");
  });

  it("auto-detects anthropic when only ANTHROPIC_API_KEY is set", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { getActiveProvider } = await import("@/lib/ai/provider");
    expect(getActiveProvider()).toBe("anthropic");
  });

  it("defaults to gemini when no keys are set", async () => {
    const { getActiveProvider } = await import("@/lib/ai/provider");
    expect(getActiveProvider()).toBe("gemini");
  });

  it("ignores AI_PROVIDER if the corresponding key is missing", async () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.GEMINI_API_KEY = "test-key";
    // No ANTHROPIC_API_KEY
    const { getActiveProvider } = await import("@/lib/ai/provider");
    expect(getActiveProvider()).toBe("gemini");
  });
});
