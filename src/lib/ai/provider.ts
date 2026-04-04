import { createChatStream } from "@/lib/anthropic/stream";
import {
  createGeminiStream,
  convertToGeminiMessages,
} from "@/lib/gemini/stream";
import { buildVisionMessage } from "@/lib/anthropic/vision";
import type Anthropic from "@anthropic-ai/sdk";

export type AIProvider = "anthropic" | "gemini";

export function getActiveProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY?.trim()) {
    return "anthropic";
  }
  if (provider === "gemini" && process.env.GEMINI_API_KEY?.trim()) {
    return "gemini";
  }
  // Auto-detect: prefer whichever has a key
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  return "gemini"; // default
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

export async function createAIStream({
  systemPrompt,
  messages,
}: StreamRequest): Promise<ReadableStream<Uint8Array>> {
  const provider = getActiveProvider();

  if (provider === "anthropic") {
    // Convert to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => {
      if (msg.role === "user" && msg.imageUrl) {
        return buildVisionMessage(msg.imageUrl, msg.content);
      }
      return { role: msg.role, content: msg.content };
    });

    return createChatStream({ systemPrompt, messages: anthropicMessages });
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
