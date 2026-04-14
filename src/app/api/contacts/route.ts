import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("listId");

  let query = supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (listId) {
    query = query.eq("list_id", listId);
  }

  const { data, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Batch import (CSV)
  if (Array.isArray(body.contacts)) {
    const contacts = body.contacts.map((c: Record<string, string>) => ({
      user_id: user.id,
      list_id: body.listId || null,
      email: c.email,
      first_name: c.first_name || c.firstName || null,
      last_name: c.last_name || c.lastName || null,
      custom_fields: c.custom_fields || {},
    }));

    // Filter out contacts with no email
    const valid = contacts.filter((c: { email?: string }) => c.email?.includes("@"));
    if (valid.length === 0) {
      return NextResponse.json({ error: "No valid email addresses found" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("contacts")
      .upsert(valid, { onConflict: "user_id,email" })
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update contact count on the list
    if (body.listId) {
      const { count } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("list_id", body.listId)
        .eq("status", "active");

      await supabase
        .from("audience_lists")
        .update({ contact_count: count || 0, updated_at: new Date().toISOString() })
        .eq("id", body.listId);
    }

    return NextResponse.json({ imported: data?.length || 0 });
  }

  // Single contact
  const { email, firstName, lastName, listId, customFields } = body;
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("contacts")
    .upsert({
      user_id: user.id,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      list_id: listId || null,
      custom_fields: customFields || {},
    }, { onConflict: "user_id,email" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update list count
  if (listId) {
    const { count } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("list_id", listId)
      .eq("status", "active");

    await supabase
      .from("audience_lists")
      .update({ contact_count: count || 0, updated_at: new Date().toISOString() })
      .eq("id", listId);
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Contact ID required" }, { status: 400 });

  // Get list_id before deleting for count update
  const { data: contact } = await supabase
    .from("contacts")
    .select("list_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update list count
  if (contact?.list_id) {
    const { count } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("list_id", contact.list_id)
      .eq("status", "active");

    await supabase
      .from("audience_lists")
      .update({ contact_count: count || 0, updated_at: new Date().toISOString() })
      .eq("id", contact.list_id);
  }

  return NextResponse.json({ success: true });
}
