import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/anthropic/prompts";
import { createAIStream } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractHtmlFromResponse, isHtmlComplete } from "@/lib/utils";
import { compileMjml, isMjml } from "@/lib/mjml/compile";
import type { ChatRequest } from "@/types/chat";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const { allowed } = checkRateLimit(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment." },
        { status: 429 }
      );
    }

    const body: ChatRequest = await request.json();
    const { conversationId, message, imageUrl, scrapedHtml, brandContext } =
      body;

    // Verify conversation ownership
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("id", conversationId)
      .single();

    if (!conversation || conversation.user_id !== user.id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
      metadata: { imageUrl, scrapedUrl: scrapedHtml ? "scraped" : undefined },
    });

    // Load conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("role, content, html_output, metadata")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);

    // Build unified message format
    // For older messages, strip HTML blocks to save context space
    // but keep the last assistant HTML so the AI can edit it
    const chatMessages: { role: "user" | "assistant"; content: string; imageUrl?: string }[] = [];

    if (history) {
      // Find the last assistant message with HTML
      const lastHtmlIndex = [...history]
        .map((m, i) => ({ i, hasHtml: m.role === "assistant" && !!m.html_output }))
        .filter((x) => x.hasHtml)
        .pop()?.i ?? -1;

      for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (msg.role === "user") {
          chatMessages.push({
            role: "user",
            content: msg.content,
            imageUrl: (msg.metadata as Record<string, string>)?.imageUrl || undefined,
          });
        } else if (msg.role === "assistant") {
          if (i === lastHtmlIndex && msg.html_output) {
            // Keep the latest HTML in full so the AI can edit it
            chatMessages.push({ role: "assistant", content: msg.content });
          } else {
            // Strip HTML/MJML blocks from older messages to save context
            const compressed = msg.content
              .replace(/```(?:html|mjml|xml)[\s\S]*?```/g, "[Previous email omitted — see latest version below]")
              .replace(/```(?:html|mjml|xml)[\s\S]*/g, "[Previous email omitted]");
            chatMessages.push({ role: "assistant", content: compressed });
          }
        }
      }
    }

    // If the latest user message isn't in history yet (race condition), add it
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (!lastMsg || lastMsg.role !== "user") {
      let content = message;
      if (scrapedHtml) {
        content = `${message}\n\nHere is the HTML from the URL:\n\`\`\`html\n${scrapedHtml}\n\`\`\``;
      }
      chatMessages.push({ role: "user", content, imageUrl });
    }

    const systemPrompt = buildSystemPrompt(brandContext);

    const stream = await createAIStream({
      systemPrompt,
      messages: chatMessages,
    });

    // Save assistant message after stream completes (background task)
    const [responseStream, saveStream] = stream.tee();

    (async () => {
      const reader = saveStream.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) fullText += data.text;
            } catch {
              continue;
            }
          }
        }

        // Extract and compile output
        let htmlOutput = extractHtmlFromResponse(fullText);

        // If it's MJML, compile to HTML
        if (htmlOutput && isMjml(htmlOutput)) {
          const compiled = await compileMjml(htmlOutput);
          if (compiled.html) {
            htmlOutput = compiled.html;
          } else {
            console.warn("[chat] MJML compilation failed:", compiled.errors);
            // Keep raw MJML as fallback
          }
        }

        // Don't save truncated/incomplete HTML
        if (htmlOutput && !isHtmlComplete(htmlOutput)) {
          console.warn("[chat] Detected truncated HTML output, not saving as html_output");
          htmlOutput = null;
        }

        const { data: savedMessage } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            role: "assistant",
            content: fullText,
            html_output: htmlOutput,
          })
          .select("id")
          .single();

        // Auto-save version if HTML was generated
        if (htmlOutput && savedMessage) {
          const { data: lastVersion } = await supabase
            .from("versions")
            .select("version_number")
            .eq("conversation_id", conversationId)
            .order("version_number", { ascending: false })
            .limit(1)
            .single();

          const versionNumber = (lastVersion?.version_number || 0) + 1;

          await supabase.from("versions").insert({
            conversation_id: conversationId,
            message_id: savedMessage.id,
            version_number: versionNumber,
            html_content: htmlOutput,
            change_summary: `Version ${versionNumber}`,
          });
        }

        // Update conversation title if first message
        if (history && history.length <= 2) {
          await supabase
            .from("conversations")
            .update({
              title: message.slice(0, 60),
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
        } else {
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        }
      } catch (saveError) {
        console.error("[chat] Background save failed:", saveError instanceof Error ? saveError.message : saveError);
      }
    })();

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[chat route error]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
