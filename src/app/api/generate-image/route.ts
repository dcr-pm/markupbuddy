import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImages } from "@/lib/xai/image";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`img-${user.id}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const { prompt, n } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const images = await generateImages({
      prompt: `${prompt}. Style: professional, clean, suitable for an HTML marketing email. No text overlays unless requested.`,
      n: Math.min(n || 2, 4),
    });

    return NextResponse.json({ images });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
