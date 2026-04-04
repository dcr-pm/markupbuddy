interface GenerateImageOptions {
  prompt: string;
  n?: number;
}

interface GeneratedImage {
  url: string;
  revised_prompt?: string;
}

export async function generateImages({
  prompt,
  n = 2,
}: GenerateImageOptions): Promise<GeneratedImage[]> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-imagine-image",
      prompt,
      n,
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `Image generation failed: ${response.status}`
    );
  }

  const data = await response.json();
  return data.data.map((img: { url: string; revised_prompt?: string }) => ({
    url: img.url,
    revised_prompt: img.revised_prompt,
  }));
}
