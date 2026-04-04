import type Anthropic from "@anthropic-ai/sdk";

export function buildVisionMessage(
  imageUrl: string,
  userText: string
): Anthropic.MessageParam {
  return {
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "url",
          url: imageUrl,
        },
      },
      {
        type: "text",
        text:
          userText ||
          "Replicate this email design as production-ready HTML. Match the layout, colors, typography, and spacing as closely as possible.",
      },
    ],
  };
}
