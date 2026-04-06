import { NextResponse } from "next/server";
import { compileMjml } from "@/lib/mjml/compile";

// Force Node.js runtime (MJML requires it)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { mjml } = await request.json();

    if (!mjml || typeof mjml !== "string") {
      return NextResponse.json(
        { error: "Missing MJML content" },
        { status: 400 }
      );
    }

    const result = await compileMjml(mjml);

    if (!result.html) {
      return NextResponse.json(
        { error: "MJML compilation failed", errors: result.errors },
        { status: 422 }
      );
    }

    return NextResponse.json({
      html: result.html,
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compilation failed" },
      { status: 500 }
    );
  }
}
