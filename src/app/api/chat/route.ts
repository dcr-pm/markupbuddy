import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/anthropic/prompts";
import { createAIStream } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractHtmlFromResponse, isHtmlComplete } from "@/lib/utils";
import { compileMjml, isMjml } from "@/lib/mjml/compile";
import {
  isPartialBlockEdit,
  extractBlocksFromPartial,
  spliceBlocks,
} from "@/lib/mjml/blocks";
import {
  validateEmail,
  shouldRetry,
  formatIssuesForLLM,
} from "@/lib/email/validators";
import type { ChatRequest, ValidationCheck } from "@/types/chat";

// Netlify/Vercel: streaming AI responses need extended timeout
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_RETRIES = 2;

interface SaveContext {
  conversationId: string;
  userId: string;
  message: string;
  historyLength: number;
}

/**
 * Wraps an AI stream with a compile-validate-retry loop.
 * Passes through text events in real-time, then after the AI finishes:
 * 1. Extracts MJML from the full response
 * 2. Compiles and validates it
 * 3. Sends validation results as SSE events
 * 4. If critical issues found, makes a correction LLM call and sends corrected HTML
 * 5. Saves the final result to the database
 */
function createValidatedStream(
  aiStream: ReadableStream<Uint8Array>,
  systemPrompt: string,
  chatMessages: { role: "user" | "assistant"; content: string; imageUrl?: string }[],
  saveCtx: SaveContext,
  supabase: Awaited<ReturnType<typeof createClient>>,
  lastFullMjml: string | null
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = aiStream.getReader();
      let fullText = "";
      let usageData: Record<string, unknown> | null = null;

      // Phase 1: Forward all text events, intercept done
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

              if (data.error) {
                // Forward errors immediately
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: data.error })}\n\n`)
                );
                continue;
              }

              if (data.done) {
                // Intercept done — we'll send our own after validation
                if (data.usage) usageData = data.usage;
                continue;
              }

              if (data.text) {
                fullText += data.text;
                // Forward text to client immediately (streaming UX preserved)
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: data.text })}\n\n`)
                );
              }
            } catch {
              // Non-JSON line, skip
              continue;
            }
          }
        }
      } catch (streamErr) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: streamErr instanceof Error ? streamErr.message : "Stream error" })}\n\n`
          )
        );
      }

      // Phase 2: Extract, compile, validate
      let htmlOutput: string | null = null;
      let finalText = fullText;

      try {
      let rawExtracted = extractHtmlFromResponse(fullText);

      // Handle partial block edits — splice into last full MJML
      if (rawExtracted && isPartialBlockEdit(rawExtracted) && lastFullMjml) {
        console.log("[chat] Detected partial block edit — splicing into last full MJML");
        const updatedBlocks = extractBlocksFromPartial(rawExtracted);
        if (updatedBlocks.length > 0) {
          rawExtracted = spliceBlocks(lastFullMjml, updatedBlocks);
          console.log(`[chat] Spliced ${updatedBlocks.length} block(s): ${updatedBlocks.map((b) => `Block ${b.number}`).join(", ")}`);
        }
      }

      // Auto-wrap if AI output has mj- tags but no <mjml> root
      if (rawExtracted && isMjml(rawExtracted) && !/<mjml[\s>]/i.test(rawExtracted)) {
        const hasHead = /<mj-head[\s>]/i.test(rawExtracted);
        const hasBody = /<mj-body[\s>]/i.test(rawExtracted);
        if (!hasBody) {
          rawExtracted = `<mjml><mj-body>${rawExtracted}</mj-body></mjml>`;
        } else if (!hasHead) {
          rawExtracted = `<mjml>${rawExtracted}</mjml>`;
        } else {
          rawExtracted = `<mjml>${rawExtracted}</mjml>`;
        }
      }

      if (rawExtracted && isMjml(rawExtracted)) {
        const compiled = await compileMjml(rawExtracted);

        if (!compiled.html) {
          // Compile failed — try correction
          const compileIssues = [
            {
              type: "compile" as const,
              severity: "error" as const,
              message: `MJML compilation failed: ${compiled.errors.join("; ")}`,
            },
          ];

          const checks: ValidationCheck[] = [
            { name: "Compiled", passed: false, detail: compiled.errors[0] || "Compilation error" },
          ];

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ validation: { passed: false, checks } })}\n\n`
            )
          );

          // Attempt correction
          const corrected = await attemptCorrection(
            systemPrompt,
            chatMessages,
            fullText,
            rawExtracted,
            formatIssuesForLLM(compileIssues),
            0
          );

          if (corrected) {
            htmlOutput = corrected.html;
            finalText = fullText; // Keep original text, just fix HTML
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ correction: { html: corrected.html } })}\n\n`
              )
            );

            // Re-validate the corrected output
            if (corrected.mjml) {
              const reValidation = validateEmail(corrected.mjml, corrected.html);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ validation: { passed: reValidation.passed, checks: reValidation.checks } })}\n\n`
                )
              );
            }
          }
        } else {
          // Compile succeeded — validate
          const validation = validateEmail(rawExtracted, compiled.html);
          htmlOutput = compiled.html;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ validation: { passed: validation.passed, checks: validation.checks } })}\n\n`
            )
          );

          // If critical issues, attempt correction
          if (!validation.passed && shouldRetry(validation.issues)) {
            const corrected = await attemptCorrection(
              systemPrompt,
              chatMessages,
              fullText,
              rawExtracted,
              formatIssuesForLLM(validation.issues),
              0
            );

            if (corrected) {
              htmlOutput = corrected.html;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ correction: { html: corrected.html } })}\n\n`
                )
              );

              // Send updated validation
              if (corrected.mjml) {
                const reValidation = validateEmail(corrected.mjml, corrected.html);
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ validation: { passed: reValidation.passed, checks: reValidation.checks } })}\n\n`
                  )
                );
              }
            }
          }
        }
      } else if (rawExtracted) {
        // Raw HTML (not MJML)
        htmlOutput = rawExtracted;
      }

      // Validate completeness
      if (htmlOutput && !isHtmlComplete(htmlOutput)) {
        console.warn("[chat] Detected truncated HTML output, not saving as html_output");
        htmlOutput = null;
      }
      } catch (validationErr) {
        console.error("[chat] Validation phase error:", validationErr instanceof Error ? validationErr.message : validationErr);
      }

      // Send final done event
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ done: true, ...(usageData ? { usage: usageData } : {}) })}\n\n`
        )
      );
      controller.close();

      // Phase 3: Background save (fire-and-forget)
      backgroundSave(supabase, saveCtx, finalText, htmlOutput).catch((err) => {
        console.error(
          "[chat] Background save failed:",
          err instanceof Error ? err.message : err
        );
      });
    },
  });
}

/**
 * Attempt a correction by making another LLM call with the issues.
 * Returns compiled HTML if successful, null if correction fails.
 */
async function attemptCorrection(
  systemPrompt: string,
  chatMessages: { role: "user" | "assistant"; content: string; imageUrl?: string }[],
  originalResponse: string,
  originalMjml: string,
  issuesSummary: string,
  attempt: number
): Promise<{ html: string; mjml: string } | null> {
  if (attempt >= MAX_RETRIES) return null;

  try {
    console.log(`[chat] Attempting correction (attempt ${attempt + 1}/${MAX_RETRIES})`);

    const correctionMessages = [
      ...chatMessages,
      { role: "assistant" as const, content: originalResponse },
      {
        role: "user" as const,
        content: `The email you just generated has quality issues that need fixing. Output the COMPLETE corrected email template with all issues resolved. Do not explain — just output the corrected code.\n\nIssues found:\n${issuesSummary}\n\nOriginal code that needs fixing:\n\`\`\`mjml\n${originalMjml}\n\`\`\``,
      },
    ];

    const correctionStream = await createAIStream({
      systemPrompt,
      messages: correctionMessages,
    });

    // Collect the full correction response (not streamed to user)
    const reader = correctionStream.getReader();
    const decoder = new TextDecoder();
    let correctionText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.text) correctionText += data.text;
        } catch {
          continue;
        }
      }
    }

    // Extract and compile the corrected MJML
    const correctedMjml = extractHtmlFromResponse(correctionText);
    if (!correctedMjml || !isMjml(correctedMjml)) return null;

    const compiled = await compileMjml(correctedMjml);
    if (!compiled.html) {
      // Correction also failed to compile — try once more
      if (attempt + 1 < MAX_RETRIES) {
        return attemptCorrection(
          systemPrompt,
          chatMessages,
          correctionText,
          correctedMjml,
          `MJML compilation still failing: ${compiled.errors.join("; ")}`,
          attempt + 1
        );
      }
      return null;
    }

    console.log(`[chat] Correction successful on attempt ${attempt + 1}`);
    return { html: compiled.html, mjml: correctedMjml };
  } catch (err) {
    console.warn(
      "[chat] Correction attempt failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Save assistant message and version to the database.
 */
async function backgroundSave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: SaveContext,
  fullText: string,
  htmlOutput: string | null
) {
  const { data: savedMessage } = await supabase
    .from("messages")
    .insert({
      conversation_id: ctx.conversationId,
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
      .eq("conversation_id", ctx.conversationId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const versionNumber = (lastVersion?.version_number || 0) + 1;

    await supabase.from("versions").insert({
      conversation_id: ctx.conversationId,
      message_id: savedMessage.id,
      version_number: versionNumber,
      html_content: htmlOutput,
      change_summary: `Version ${versionNumber}`,
    });
  }

  // Update conversation title/timestamp
  if (ctx.historyLength <= 2) {
    await supabase
      .from("conversations")
      .update({
        title: ctx.message.slice(0, 60),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.conversationId);
  } else {
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ctx.conversationId);
  }
}

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
    const chatMessages: { role: "user" | "assistant"; content: string; imageUrl?: string }[] = [];

    if (history) {
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
            chatMessages.push({ role: "assistant", content: msg.content });
          } else {
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

    // Extract last full MJML from history for partial block splicing
    let lastFullMjml: string | null = null;
    if (history) {
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role === "assistant" && msg.content) {
          const extracted = extractHtmlFromResponse(msg.content);
          if (extracted && isMjml(extracted) && extracted.includes("<mjml")) {
            lastFullMjml = extracted;
            break;
          }
        }
      }
    }

    const stream = await createAIStream({
      systemPrompt,
      messages: chatMessages,
    });

    // Wrap with validation
    const validatedStream = createValidatedStream(
      stream,
      systemPrompt,
      chatMessages,
      {
        conversationId,
        userId: user.id,
        message,
        historyLength: history?.length || 0,
      },
      supabase,
      lastFullMjml
    );

    return new Response(validatedStream, {
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
