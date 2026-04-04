import { getGeminiClient } from "./client";

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiStreamOptions {
  systemPrompt: string;
  messages: GeminiMessage[];
}

export function convertToGeminiMessages(
  messages: { role: string; content: string | object }[]
): GeminiMessage[] {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [
      {
        text: typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
      },
    ],
  }));
}

export async function createGeminiStream({
  systemPrompt,
  messages,
}: GeminiStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const client = getGeminiClient();
  const encoder = new TextEncoder();

  const stream = await client.models.generateContentStream({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 65536,
    },
    contents: messages.map((msg) => ({
      role: msg.role,
      parts: msg.parts,
    })),
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            const data = JSON.stringify({ text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, usage: {} })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errorMessage })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}
