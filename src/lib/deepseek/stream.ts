import { getDeepSeekClient } from "./client";

interface DeepSeekMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DeepSeekStreamOptions {
  systemPrompt: string;
  messages: DeepSeekMessage[];
}

export function convertToDeepSeekMessages(
  messages: { role: string; content: string | object }[]
): DeepSeekMessage[] {
  return messages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content:
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content),
  }));
}

export async function createDeepSeekStream({
  systemPrompt,
  messages,
}: DeepSeekStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const client = getDeepSeekClient();
  const encoder = new TextEncoder();

  const stream = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 8192,
    stream: true,
  });

  return new ReadableStream({
    async start(controller) {
      let gotContent = false;
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            gotContent = true;
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
        if (!gotContent) {
          controller.error(error);
        } else {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMessage })}\n\n`
            )
          );
          controller.close();
        }
      }
    },
  });
}
