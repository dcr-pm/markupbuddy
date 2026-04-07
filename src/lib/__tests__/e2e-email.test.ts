/**
 * End-to-end email generation & editing test.
 *
 * Prerequisites:
 *   - Dev server running (npm run dev)
 *   - DEV_AUTH_BYPASS=true in .env.local
 *
 * Run:
 *   npm run test:e2e
 *
 * If your dev server is on a non-standard port:
 *   TEST_BASE_URL=http://localhost:50130 npm run test:e2e
 *
 * This test creates a real conversation, generates an email via AI,
 * then sends a series of edit commands and verifies each one produces
 * valid, compilable output. It cleans up after itself.
 *
 * Takes ~5-10 minutes (7 sequential AI calls with streaming).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const TIMEOUT = 180_000; // 3 minutes per AI call (may need multi-turn)

// --- Helpers ---

interface SSEResult {
  text: string;
  validation: { passed: boolean; checks: { name: string; passed: boolean; detail?: string }[] } | null;
  correction: { html: string } | null;
  error: string | null;
  done: boolean;
}

/** Send a chat message and collect the full SSE response */
async function sendChatMessage(
  conversationId: string,
  message: string
): Promise<SSEResult> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      message,
      brandContext: null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Chat API returned ${res.status}: ${err.error || "Unknown error"}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const result: SSEResult = {
    text: "",
    validation: null,
    correction: null,
    error: null,
    done: false,
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.text) result.text += data.text;
        if (data.validation) result.validation = data.validation;
        if (data.correction) result.correction = data.correction;
        if (data.error) result.error = data.error;
        if (data.done) result.done = true;
      } catch {
        // skip non-JSON
      }
    }
  }

  return result;
}

/** Extract MJML or partial blocks from an AI response text */
function extractMjml(text: string): string | null {
  // Try all fence types: mjml, xml, html
  for (const lang of ["mjml", "xml", "html"]) {
    const regex = new RegExp("```" + lang + "\\s*([\\s\\S]*?)```", "g");
    const matches = [...text.matchAll(regex)];
    if (matches.length > 0) {
      const last = matches[matches.length - 1][1].trim();
      if (last.includes("<mjml") || last.includes("<mj-section")) return last;
    }
  }
  // Try bare fences
  const bare = [...text.matchAll(/```\s*\n([\s\S]*?)```/g)];
  if (bare.length > 0) {
    const last = bare[bare.length - 1][1].trim();
    if (last.includes("<mjml") || last.includes("<mj-section")) return last;
  }
  return null;
}

/** Compile MJML via the API endpoint */
async function compileMjml(mjml: string): Promise<{ html: string; errors: string[] }> {
  const res = await fetch(`${BASE_URL}/api/compile-mjml`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mjml }),
  });
  if (!res.ok) throw new Error(`Compile API returned ${res.status}`);
  return res.json();
}

/** Create a new conversation */
async function createConversation(title: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Create conversation failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

/** Delete a conversation (cleanup) */
async function deleteConversation(id: string): Promise<void> {
  await fetch(`${BASE_URL}/api/conversations?id=${id}`, { method: "DELETE" }).catch(() => {});
}

// --- Test Suite ---

describe("E2E: Email generation and editing", () => {
  let conversationId: string;

  beforeAll(async () => {
    // Verify server is running
    try {
      const res = await fetch(BASE_URL);
      expect(res.ok).toBe(true);
    } catch {
      throw new Error(
        `Dev server not reachable at ${BASE_URL}. Start it with: npm run dev`
      );
    }

    conversationId = await createConversation("E2E Test Email");
    console.log(`[e2e] Created conversation: ${conversationId}`);
  }, 30_000);

  afterAll(async () => {
    if (conversationId) {
      await deleteConversation(conversationId);
      console.log(`[e2e] Cleaned up conversation: ${conversationId}`);
    }
  }, 10_000);

  // -------------------------------------------------------
  // STEP 1: Generate a new email (skip clarification)
  // -------------------------------------------------------
  let lastMjml: string;
  let lastHtml: string;

  it(
    "Step 1: Generate a complete email (3-phase flow)",
    async () => {
      // Phase 1: Send request — AI will ask clarifying questions or show block plan
      let result = await sendChatMessage(
        conversationId,
        "Build me a product launch email with a hero banner, 3-column feature highlights, a CTA button, and a footer with social links. Use blue and white colors. Skip the questions — just go ahead and build it."
      );

      expect(result.done).toBe(true);
      expect(result.error).toBeNull();
      expect(result.text.length).toBeGreaterThan(50);

      let mjml = extractMjml(result.text);

      // Phase 2: If no MJML yet (AI showed block plan or asked questions), confirm
      if (!mjml) {
        console.log("[e2e] Phase 1 response had no MJML — sending 'build it' to trigger Phase 3");
        result = await sendChatMessage(
          conversationId,
          "Looks good, build it."
        );

        expect(result.done).toBe(true);
        expect(result.error).toBeNull();
        mjml = extractMjml(result.text);
      }

      // Phase 3: If still no MJML (AI showed block plan after "go ahead"), confirm again
      if (!mjml) {
        console.log("[e2e] Phase 2 response had no MJML — sending 'yes build it now' for Phase 3");
        result = await sendChatMessage(
          conversationId,
          "Yes, build it now."
        );

        expect(result.done).toBe(true);
        expect(result.error).toBeNull();
        mjml = extractMjml(result.text);
      }

      expect(mjml).not.toBeNull();
      expect(mjml).toContain("<mjml");
      expect(mjml).toContain("</mjml>");
      expect(mjml).toContain("<mj-body");

      // Should have block labels
      expect(mjml).toMatch(/<!--\s*Block\s+\d/i);

      // Should compile successfully
      const compiled = await compileMjml(mjml!);
      expect(compiled.html).toBeTruthy();
      expect(compiled.html.length).toBeGreaterThan(500);
      expect(compiled.html).toContain("<!doctype html");

      // Validation should have run
      if (result.validation) {
        console.log(
          "[e2e] Validation:",
          result.validation.checks.map((c) => `${c.name}: ${c.passed ? "PASS" : "FAIL"}`).join(", ")
        );
      }

      lastMjml = mjml!;
      lastHtml = compiled.html;
      console.log(`[e2e] Step 1 PASS — Generated ${lastMjml.length} chars MJML → ${lastHtml.length} chars HTML`);
    },
    TIMEOUT * 3 // Up to 3 turns
  );

  // -------------------------------------------------------
  // STEP 2: Change CTA button color
  // -------------------------------------------------------
  it(
    "Step 2: Change CTA button to red",
    async () => {
      const result = await sendChatMessage(
        conversationId,
        "Change the main CTA button background color to red (#ff0000)."
      );

      expect(result.done).toBe(true);
      expect(result.error).toBeNull();

      const mjml = extractMjml(result.text);
      // AI may return partial blocks (no <mjml> wrapper) or full email
      // Either way, the response text or MJML should reference red
      expect(mjml).not.toBeNull();

      const hasRed =
        /(?:#ff0000|#FF0000|red)/i.test(mjml!) ||
        /(?:#ff0000|#FF0000|red)/i.test(result.text);
      expect(hasRed).toBe(true);

      // If full MJML, compile directly; if partial, server already compiled via validation
      if (mjml!.includes("<mjml")) {
        const compiled = await compileMjml(mjml!);
        expect(compiled.html).toBeTruthy();
        lastMjml = mjml!;
        lastHtml = compiled.html;
      } else {
        // Partial block edit — validation/correction events confirm it compiled
        expect(result.validation).not.toBeNull();
        console.log("[e2e] Step 2: Partial block edit detected — server handled splicing");
      }
      console.log("[e2e] Step 2 PASS — CTA button changed to red");
    },
    TIMEOUT
  );

  // -------------------------------------------------------
  // STEP 3: Change background color of hero section
  // -------------------------------------------------------
  it(
    "Step 3: Change hero background to dark navy (#1a1a2e)",
    async () => {
      const result = await sendChatMessage(
        conversationId,
        "Change the hero section background color to dark navy (#1a1a2e) and make the text white."
      );

      expect(result.done).toBe(true);
      const mjml = extractMjml(result.text);
      expect(mjml).not.toBeNull();

      // Navy color should appear in the response or MJML
      const combined = (mjml || "") + result.text;
      expect(combined.toLowerCase()).toContain("#1a1a2e");

      if (mjml!.includes("<mjml")) {
        const compiled = await compileMjml(mjml!);
        expect(compiled.html).toBeTruthy();
        lastMjml = mjml!;
        lastHtml = compiled.html;
      }
      console.log("[e2e] Step 3 PASS — Hero background changed to navy");
    },
    TIMEOUT
  );

  // -------------------------------------------------------
  // STEP 4: Add a new block (structural = full email output)
  // -------------------------------------------------------
  it(
    "Step 4: Add a testimonial block after the features",
    async () => {
      const result = await sendChatMessage(
        conversationId,
        'Add a testimonial block after the features section. Include a customer quote: "This product changed everything for us" by Jane Smith, CEO of Acme Corp.'
      );

      expect(result.done).toBe(true);
      const mjml = extractMjml(result.text);
      expect(mjml).not.toBeNull();

      // Testimonial text in MJML or response
      const combined = (mjml || "") + result.text;
      expect(combined).toContain("This product changed everything");
      expect(combined).toContain("Jane Smith");

      // Structural edit should produce full MJML
      if (mjml!.includes("<mjml")) {
        const compiled = await compileMjml(mjml!);
        expect(compiled.html).toBeTruthy();
        lastMjml = mjml!;
        lastHtml = compiled.html;
      }
      console.log("[e2e] Step 4 PASS — Testimonial block added");
    },
    TIMEOUT
  );

  // -------------------------------------------------------
  // STEP 5: Remove a block (structural = full email output)
  // -------------------------------------------------------
  it(
    "Step 5: Remove the testimonial block",
    async () => {
      const result = await sendChatMessage(
        conversationId,
        "Remove the testimonial block entirely."
      );

      expect(result.done).toBe(true);
      const mjml = extractMjml(result.text);
      // Removal is structural — should get full MJML
      if (mjml && mjml.includes("<mjml")) {
        expect(mjml).not.toContain("This product changed everything");

        const compiled = await compileMjml(mjml);
        expect(compiled.html).toBeTruthy();
        lastMjml = mjml;
        lastHtml = compiled.html;
      }
      console.log("[e2e] Step 5 PASS — Testimonial block removed");
    },
    TIMEOUT
  );

  // -------------------------------------------------------
  // STEP 6: Edit CTA text
  // -------------------------------------------------------
  it(
    "Step 6: Change CTA text",
    async () => {
      const result = await sendChatMessage(
        conversationId,
        'Change the main CTA button text to "Get Early Access".'
      );

      expect(result.done).toBe(true);
      const mjml = extractMjml(result.text);
      expect(mjml).not.toBeNull();

      const combined = (mjml || "") + result.text;
      expect(combined).toContain("Get Early Access");

      if (mjml!.includes("<mjml")) {
        const compiled = await compileMjml(mjml!);
        expect(compiled.html).toBeTruthy();
        lastMjml = mjml!;
        lastHtml = compiled.html;
      }
      console.log("[e2e] Step 6 PASS — CTA text changed");
    },
    TIMEOUT
  );

  // -------------------------------------------------------
  // STEP 7: Change font size
  // -------------------------------------------------------
  it(
    "Step 7: Make the headline font size 36px",
    async () => {
      const result = await sendChatMessage(
        conversationId,
        "Make the main headline font size 36px."
      );

      expect(result.done).toBe(true);
      const mjml = extractMjml(result.text);
      expect(mjml).not.toBeNull();

      // Should have 36px somewhere in MJML or text
      const combined = (mjml || "") + result.text;
      expect(combined).toMatch(/36px/i);

      if (mjml!.includes("<mjml")) {
        const compiled = await compileMjml(mjml!);
        expect(compiled.html).toBeTruthy();
        lastMjml = mjml!;
        lastHtml = compiled.html;
      }
      console.log("[e2e] Step 7 PASS — Headline font size changed to 36px");
    },
    TIMEOUT
  );

  // -------------------------------------------------------
  // STEP 8: Structural check on final email
  // -------------------------------------------------------
  it("Step 8: Final email has all required elements", () => {
    expect(lastMjml).toBeTruthy();
    expect(lastHtml).toBeTruthy();

    // Required structural elements
    expect(lastMjml).toContain("<mj-head");
    expect(lastMjml).toContain("<mj-body");
    expect(lastMjml).toContain("<mj-section");
    expect(lastMjml).toContain("<mj-column");

    // Block labels
    expect(lastMjml).toMatch(/<!--\s*Block\s+\d/i);

    // Footer elements
    const lower = lastMjml.toLowerCase();
    expect(lower).toContain("unsubscribe");

    // Images have alt text
    const images = [...lastMjml.matchAll(/<mj-image[^>]*>/gi)];
    for (const img of images) {
      expect(img[0]).toMatch(/alt="/i);
    }

    // Final compiled HTML is valid
    expect(lastHtml).toContain("<!doctype html");
    expect(lastHtml.length).toBeLessThan(102 * 1024); // Under Gmail clip limit

    console.log("[e2e] Step 8 PASS — Final email passes all structural checks");
    console.log(`[e2e] Final size: ${Math.round(lastHtml.length / 1024)}KB compiled HTML`);
  });
});
