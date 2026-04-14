import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("campaigns")
    .select("*, audience_lists(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, subject, preheader, fromName, replyTo, htmlContent, conversationId, brandId, listId } = body;

  if (!name || !htmlContent) {
    return NextResponse.json({ error: "Name and HTML content are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name,
      subject: subject || null,
      preheader: preheader || null,
      from_name: fromName || null,
      reply_to: replyTo || null,
      html_content: htmlContent,
      conversation_id: conversationId || null,
      brand_id: brandId || null,
      list_id: listId || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });

  // Map camelCase to snake_case
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
  if (updates.preheader !== undefined) dbUpdates.preheader = updates.preheader;
  if (updates.fromName !== undefined) dbUpdates.from_name = updates.fromName;
  if (updates.replyTo !== undefined) dbUpdates.reply_to = updates.replyTo;
  if (updates.htmlContent !== undefined) dbUpdates.html_content = updates.htmlContent;
  if (updates.listId !== undefined) dbUpdates.list_id = updates.listId;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  const { data, error } = await supabase
    .from("campaigns")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
