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

  // This await throws on connection-level errors (503, rate limit)
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

  // Get the async iterator manually so we can read the first chunk
  // without closing the iterator (for-await + break would close it)
  const iterator = stream[Symbol.asyncIterator]();

  // Read first chunk to verify the stream is working
  let firstResult;
  try {
    firstResult = await iterator.next();
  } catch (error) {
    // First chunk failed — throw for provider fallback
    throw error;
  }

  if (firstResult.done || !firstResult.value?.text) {
    throw new Error("Empty response from Gemini");
  }

  const firstText = firstResult.value.text;

  return new ReadableStream({
    start(controller) {
      // Replay verified first chunk
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ text: firstText })}\n\n`)
      );

      // Continue streaming the rest from the same iterator
      (async () => {
        try {
          while (true) {
            const { done, value } = await iterator.next();
            if (done) break;
            const text = value?.text;
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
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
      })();
    },
  });
}
