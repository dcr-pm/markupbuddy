import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, html } = await request.json();

  if (!conversationId || !html) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // Verify conversation belongs to user
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update html_output on the last assistant message
  const { data: lastMsg } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (lastMsg) {
    await supabase
      .from("messages")
      .update({ html_output: html })
      .eq("id", lastMsg.id);
  }

  return NextResponse.json({ success: true });
}
