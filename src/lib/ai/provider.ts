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
            content: `[Image uploaded and hosted at: ${msg.imageUrl} — use this exact URL as the src when placing this image in the email HTML.]\n\n${msg.content}`,
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
          content: `[Image uploaded and hosted at: ${msg.imageUrl} — use this exact URL as the src when placing this image in the email HTML.]\n\n${msg.content}`,
        };
      }
      return { role: msg.role, content: msg.content };
    })
  );
  return createGeminiStream({ systemPrompt, messages: geminiMessages });
}

/**
 * Wraps a provider stream with error detection on the first chunk.
 * If the first chunk contains an error, throws so fallback can trigger.
 */
function createVerifiedStream(
  innerStream: ReadableStream<Uint8Array>
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const reader = innerStream.getReader();
    const decoder = new TextDecoder();

    reader.read().then(({ done, value }) => {
      if (done) {
        // Empty stream — something wrong
        reject(new Error("Empty response from provider"));
        return;
      }

      const firstChunk = decoder.decode(value, { stream: true });

      // Check if first chunk contains an error or unavailable status
      const chunkText = firstChunk.toLowerCase();
      if (
        chunkText.includes("unavailable") ||
        chunkText.includes("503") ||
        chunkText.includes("overloaded") ||
        chunkText.includes("high demand") ||
        chunkText.includes("resource exhausted") ||
        chunkText.includes("rate limit") ||
        chunkText.includes("too many requests")
      ) {
        reject(new Error(firstChunk.slice(0, 200)));
        return;
      }

      for (const line of firstChunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) {
            reject(new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error)));
            return;
          }
        } catch {
          // Not valid JSON, continue
        }
      }

      // First chunk is good — create a new stream that replays it
      const encoder = new TextEncoder();
      resolve(
        new ReadableStream({
          start(controller) {
            // Replay first chunk
            controller.enqueue(value);
            // Pipe the rest
            (async () => {
              try {
                while (true) {
                  const { done: d, value: v } = await reader.read();
                  if (d) break;
                  controller.enqueue(v);
                }
                controller.close();
              } catch (err) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream error" })}\n\n`
                  )
                );
                controller.close();
              }
            })();
          },
        })
      );
    }).catch(reject);
  });
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

  console.log(`[ai] Available providers: ${allProviders.join(", ")}`);
  console.log(`[ai] Fallback order: ${fallbackOrder.join(" → ")}`);

  let lastError: unknown;

  for (const provider of fallbackOrder) {
    try {
      console.log(`[ai] Trying provider: ${provider}`);
      const rawStream = await createStreamForProvider(provider, request);
      // Verify first chunk succeeds before committing to this provider
      const verifiedStream = await createVerifiedStream(rawStream);
      console.log(`[ai] Using provider: ${provider}`);
      return verifiedStream;
    } catch (error) {
      lastError = error;
      console.warn(
        `[ai] Provider ${provider} failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      continue;
    }
  }

  throw lastError || new Error("All AI providers failed");
}
