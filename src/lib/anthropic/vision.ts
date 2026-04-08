import type Anthropic from "@anthropic-ai/sdk";

export function buildVisionMessage(
  imageUrl: string,
  userText: string
): Anthropic.MessageParam {
  const defaultText =
    "Replicate this email design as production-ready HTML. Match the layout, colors, typography, and spacing as closely as possible.";
  const urlHint = `\n\n[The uploaded image is hosted at: ${imageUrl} — use this exact URL as the src when placing this image in the email HTML.]`;

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
        text: (userText || defaultText) + urlHint,
      },
    ],
  };
}
