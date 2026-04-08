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

  let stream;
  try {
    stream = await client.models.generateContentStream({
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
  } catch (error) {
    // Connection-level errors (503, rate limit) — throw immediately for fallback
    throw error;
  }

  // Collect first chunk to verify the stream works before returning
  const chunks: string[] = [];
  try {
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        chunks.push(text);
        break; // Got first chunk — stream is working
      }
    }
  } catch (error) {
    // First chunk failed — throw for fallback
    throw error;
  }

  if (chunks.length === 0) {
    throw new Error("Empty response from Gemini");
  }

  return new ReadableStream({
    start(controller) {
      // Replay first chunk
      const data = JSON.stringify({ text: chunks[0] });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      // Continue streaming the rest
      (async () => {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              const d = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${d}\n\n`));
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
