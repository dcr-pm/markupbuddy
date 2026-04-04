import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderForTestUser } from "@/lib/email/scripting";
import { inlineStyles } from "@/lib/email/inline";
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
    const { html, testData, scriptingEngine, conversationId } =
      await request.json();

    if (!html) {
      return NextResponse.json(
        { error: "HTML content required" },
        { status: 400 }
      );
    }

    const engine = (scriptingEngine || "none") as ScriptingEngine;
    const inlinedHtml = inlineStyles(html);

    // Use provided test data or generate from test users
    let rows: Record<string, string>[] = testData;

    if (!rows || rows.length === 0) {
      // Fetch existing test users as fallback
      const { data: testUsers } = await supabase
        .from("test_users")
        .select("*")
        .eq("user_id", user.id);

      if (testUsers && testUsers.length > 0) {
        rows = testUsers.map((tu) => ({
          firstName: tu.name.split(" ")[0] || "",
          lastName: tu.name.split(" ").slice(1).join(" ") || "",
          name: tu.name,
          email: tu.email,
          tier: tu.tier || "",
          client: tu.client || "",
          ...(tu.custom_fields as Record<string, string>),
        }));
      }
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No test data available. Add test users or provide test data." },
        { status: 400 }
      );
    }

    // Render for each row
    const proofResults = rows.map((row) => ({
      data: row,
      renderedHtml: renderForTestUser(inlinedHtml, engine, row),
    }));

    // Save test DE if conversation provided
    if (conversationId) {
      await supabase.from("test_data_extensions").insert({
        user_id: user.id,
        conversation_id: conversationId,
        name: `Proof - ${new Date().toLocaleString()}`,
        columns: Object.keys(rows[0]),
        rows,
      });
    }

    return NextResponse.json({ proofs: proofResults });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Proofing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
