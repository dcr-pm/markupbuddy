import { createChatStream } from "@/lib/anthropic/stream";
import {
  createGeminiStream,
  convertToGeminiMessages,
} from "@/lib/gemini/stream";
import {
  createDeepSeekStream,
  convertToDeepSeekMessages,
} from "@/lib/deepseek/stream";
import { buildVisionMessage } from "@/lib/anthropic/vision";
import type Anthropic from "@anthropic-ai/sdk";

export type AIProvider = "anthropic" | "gemini" | "deepseek";

function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (process.env.GEMINI_API_KEY?.trim()) providers.push("gemini");
  if (process.env.DEEPSEEK_API_KEY?.trim()) providers.push("deepseek");
  if (process.env.ANTHROPIC_API_KEY?.trim()) providers.push("anthropic");
  return providers;
}

export function getActiveProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (
    provider === "anthropic" &&
    process.env.ANTHROPIC_API_KEY?.trim()
  ) {
    return "anthropic";
  }
  if (provider === "gemini" && process.env.GEMINI_API_KEY?.trim()) {
    return "gemini";
  }
  if (provider === "deepseek" && process.env.DEEPSEEK_API_KEY?.trim()) {
    return "deepseek";
  }
  // Auto-detect: prefer whichever has a key
  const available = getAvailableProviders();
  return available[0] || "gemini";
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

interface StreamRequest {
  systemPrompt: string;
  messages: ChatMessage[];
}

function createStreamForProvider(
  provider: AIProvider,
  { systemPrompt, messages }: StreamRequest
): Promise<ReadableStream<Uint8Array>> {
  if (provider === "anthropic") {
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => {
      if (msg.role === "user" && msg.imageUrl) {
        return buildVisionMessage(msg.imageUrl, msg.content);
      }
      return { role: msg.role, content: msg.content };
    });
    return createChatStream({ systemPrompt, messages: anthropicMessages });
  }

  if (provider === "deepseek") {
    const deepseekMessages = convertToDeepSeekMessages(
      messages.map((msg) => {
        if (msg.role === "user" && msg.imageUrl) {
          return {
            role: "user",
            content: `[Image uploaded: ${msg.imageUrl}]\n\n${msg.content}`,
          };
        }
        return { role: msg.role, content: msg.content };
      })
    );
    return createDeepSeekStream({ systemPrompt, messages: deepseekMessages });
  }

  // Gemini
  const geminiMessages = convertToGeminiMessages(
    messages.map((msg) => {
      if (msg.role === "user" && msg.imageUrl) {
        return {
          role: "user",
          content: `[Image uploaded: ${msg.imageUrl}]\n\n${msg.content}`,
        };
      }
      return { role: msg.role, content: msg.content };
    })
  );
  return createGeminiStream({ systemPrompt, messages: geminiMessages });
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("rate limit") ||
      msg.includes("rate_limit") ||
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("resource exhausted") ||
      msg.includes("too many requests")
    );
  }
  return false;
}

export async function createAIStream(
  request: StreamRequest
): Promise<ReadableStream<Uint8Array>> {
  const primary = getActiveProvider();
  const allProviders = getAvailableProviders();

  // Build fallback order: primary first, then others
  const fallbackOrder = [
    primary,
    ...allProviders.filter((p) => p !== primary),
  ];

  let lastError: unknown;

  for (const provider of fallbackOrder) {
    try {
      console.log(`[ai] Trying provider: ${provider}`);
      const stream = await createStreamForProvider(provider, request);
      console.log(`[ai] Using provider: ${provider}`);
      return stream;
    } catch (error) {
      lastError = error;
      console.warn(
        `[ai] Provider ${provider} failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      if (!isRateLimitError(error)) {
        // Non-rate-limit errors might be transient, still try fallback
        continue;
      }
      // Rate limit — definitely try next provider
      continue;
    }
  }

  throw lastError || new Error("All AI providers failed");
}
