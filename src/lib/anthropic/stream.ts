import { getAnthropicClient } from "./client";
import type Anthropic from "@anthropic-ai/sdk";

interface StreamOptions {
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  onText?: (text: string) => void;
}

export async function createChatStream({
  systemPrompt,
  messages,
}: StreamOptions): Promise<ReadableStream<Uint8Array>> {
  const client = getAnthropicClient();
  const encoder = new TextEncoder();

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    system: systemPrompt,
    messages,
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({ text: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        const finalMessage = await stream.finalMessage();
        const usage = {
          input_tokens: finalMessage.usage.input_tokens,
          output_tokens: finalMessage.usage.output_tokens,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, usage })}\n\n`)
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
