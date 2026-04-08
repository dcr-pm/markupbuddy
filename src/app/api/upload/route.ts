import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadFile } from "@/lib/storage/upload";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, GIF, WebP, PDF, DOC, DOCX" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = ALLOWED_TYPES[file.type];
    const url = await uploadFile(buffer, file.type, extension);

    return NextResponse.json({ url });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    console.error("[upload] Failed:", raw);

    let friendly = "Something went wrong uploading your image. Please try again.";
    if (raw.includes("Bucket not found") || raw.includes("not found")) {
      friendly = "Image storage is not set up yet. Please contact support.";
    } else if (raw.includes("exceeded") || raw.includes("quota") || raw.includes("limit")) {
      friendly = "Storage limit reached. Please try a smaller image or contact support.";
    } else if (raw.includes("permission") || raw.includes("policy") || raw.includes("denied")) {
      friendly = "Image storage permissions need to be configured. Please contact support.";
    } else if (raw.includes("network") || raw.includes("timeout") || raw.includes("ECONNREFUSED")) {
      friendly = "Could not reach image storage. Please check your connection and try again.";
    }

    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
