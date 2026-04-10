import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTestEmail } from "@/lib/resend/client";
import { renderForTestUser } from "@/lib/email/scripting";
import { inlineStyles } from "@/lib/email/inline";
import type { SendTestRequest } from "@/types/test-user";
import type { ScriptingEngine } from "@/types/brand";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, html, subject, fromName, replyTo, scriptingEngine, directEmail } =
      body;

    // Direct email send (from chat input) — skip test user lookup
    if (directEmail) {
      const inlinedHtml = inlineStyles(html);
      const result = await sendTestEmail({
        to: directEmail,
        subject: subject || "Test Email from MarkupBuddy",
        html: inlinedHtml,
        fromName,
        replyTo,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || "Send failed" }, { status: 500 });
      }

      await supabase.from("test_sends").insert({
        user_id: user.id,
        conversation_id: conversationId,
        recipients: [{ email: directEmail, status: "sent" }],
        subject,
        from_name: fromName,
      });

      return NextResponse.json({ results: [{ email: directEmail, status: "sent" }] });
    }

    const { recipients } = body as SendTestRequest;

    // Get test users
    const { data: testUsers } = await supabase
      .from("test_users")
      .select("*")
      .eq("user_id", user.id)
      .in("id", recipients);

    if (!testUsers || testUsers.length === 0) {
      return NextResponse.json(
        { error: "No valid recipients found" },
        { status: 400 }
      );
    }

    const inlinedHtml = inlineStyles(html);
    const engine = (scriptingEngine || "none") as ScriptingEngine;
    const results = [];

    for (const testUser of testUsers) {
      // Merge test user data for rendering
      const userData: Record<string, string> = {
        firstName: testUser.name.split(" ")[0] || "",
        lastName: testUser.name.split(" ").slice(1).join(" ") || "",
        name: testUser.name,
        email: testUser.email,
        tier: testUser.tier || "",
        client: testUser.client || "",
        ...(testUser.custom_fields as Record<string, string>),
      };

      // Render dynamic content for this test user
      const renderedHtml = renderForTestUser(inlinedHtml, engine, userData);

      // Personalize subject line too
      const renderedSubject = renderForTestUser(
        subject || "Test Email from MarkupBuddy",
        engine,
        userData
      );

      const result = await sendTestEmail({
        to: testUser.email,
        subject: renderedSubject,
        html: renderedHtml,
        fromName,
        replyTo,
      });

      results.push({
        test_user_id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        status: result.success ? "sent" : "failed",
        error: result.error,
      });
    }

    // Log the send
    await supabase.from("test_sends").insert({
      user_id: user.id,
      conversation_id: conversationId,
      recipients: results,
      subject,
      from_name: fromName,
      reply_to: replyTo,
    });

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
