import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTestEmail } from "@/lib/resend/client";
import { renderForTestUser } from "@/lib/email/scripting";
import { inlineStyles } from "@/lib/email/inline";
import type { ScriptingEngine } from "@/types/brand";

/** Resend free tier: 100 emails/day */
const DAILY_LIMIT = 100;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000; // 1 second between batches to avoid rate limits

async function getDailySendCount(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("campaign_sends")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", today.toISOString())
    .in(
      "campaign_id",
      (
        await supabase
          .from("campaigns")
          .select("id")
          .eq("user_id", userId)
      ).data?.map((c: { id: string }) => c.id) || []
    );

  return count || 0;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, scriptingEngine } = await request.json();
  if (!campaignId) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });

  // Load campaign
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (campErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status === "sending" || campaign.status === "sent") {
    return NextResponse.json({ error: `Campaign is already ${campaign.status}` }, { status: 400 });
  }

  if (!campaign.list_id) {
    return NextResponse.json({ error: "No audience list selected for this campaign" }, { status: 400 });
  }

  // Load contacts from the audience list
  const { data: contacts, error: contactErr } = await supabase
    .from("contacts")
    .select("*")
    .eq("list_id", campaign.list_id)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (contactErr || !contacts || contacts.length === 0) {
    return NextResponse.json({ error: "No active contacts in this audience list" }, { status: 400 });
  }

  // Check daily send limit
  const dailySent = await getDailySendCount(supabase, user.id);
  const remaining = DAILY_LIMIT - dailySent;

  if (remaining <= 0) {
    return NextResponse.json(
      { error: "Daily send limit reached (100 emails/day on free tier). Try again tomorrow." },
      { status: 429 }
    );
  }

  const toSend = contacts.slice(0, remaining);
  const queued = contacts.length - toSend.length;

  // Get brand for sender domain
  let senderDomain = process.env.RESEND_DOMAIN || "admin.markupbuddy.com";
  if (campaign.brand_id) {
    const { data: brand } = await supabase
      .from("brands")
      .select("sender_domain")
      .eq("id", campaign.brand_id)
      .single();
    if (brand?.sender_domain) senderDomain = brand.sender_domain;
  }

  // Mark campaign as sending
  await supabase
    .from("campaigns")
    .update({
      status: "sending",
      recipient_count: contacts.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  // Prepare HTML
  const inlinedHtml = inlineStyles(campaign.html_content);
  const engine = (scriptingEngine || "none") as ScriptingEngine;

  let sentCount = 0;
  let failedCount = 0;

  // Send in batches
  for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
    const batch = toSend.slice(i, i + BATCH_SIZE);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchPromises = batch.map(async (contact: any) => {
      const userData: Record<string, string> = {
        firstName: String(contact.first_name || ""),
        lastName: String(contact.last_name || ""),
        name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "",
        email: String(contact.email || ""),
        ...(contact.custom_fields as Record<string, string>),
      };

      const renderedHtml = renderForTestUser(inlinedHtml, engine, userData);
      const renderedSubject = renderForTestUser(
        campaign.subject || "Email from MarkupBuddy",
        engine,
        userData
      );

      const result = await sendTestEmail({
        to: contact.email,
        subject: renderedSubject,
        html: renderedHtml,
        fromName: campaign.from_name || undefined,
        replyTo: campaign.reply_to || undefined,
      });

      // Log individual send
      await supabase.from("campaign_sends").insert({
        campaign_id: campaignId,
        contact_id: contact.id,
        status: result.success ? "sent" : "failed",
        error: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
      });

      if (result.success) sentCount++;
      else failedCount++;
    });

    await Promise.all(batchPromises);

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < toSend.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Update campaign status
  const finalStatus = failedCount === toSend.length ? "failed" : "sent";
  await supabase
    .from("campaigns")
    .update({
      status: finalStatus,
      sent_count: sentCount,
      failed_count: failedCount,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return NextResponse.json({
    sent: sentCount,
    failed: failedCount,
    queued,
    status: finalStatus,
    message: queued > 0
      ? `Sent ${sentCount} of ${contacts.length} emails. ${queued} contacts exceeded the daily limit and were not sent.`
      : `Sent ${sentCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ""}.`,
  });
}
