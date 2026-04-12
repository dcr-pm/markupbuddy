import type Anthropic from "@anthropic-ai/sdk";

/**
 * Detect whether the user's message implies they want the image replicated
 * as an email (vs. just inserting it as an asset into an existing email).
 */
export function isReplicationRequest(userText: string): boolean {
  if (!userText) return true; // No text + image = replicate
  const lower = userText.toLowerCase();
  // Explicit replication intent
  if (/\b(replicate|reproduce|copy|clone|recreate|rebuild|match|convert)\b/.test(lower)) return true;
  if (/\b(make|build|create|turn).*(this|from|into|email|html)\b/.test(lower)) return true;
  if (/\b(screenshot|design|figma|mockup|mock-up|comp|reference)\b/.test(lower)) return true;
  // Short/empty messages with an image = replicate
  if (userText.trim().split(/\s+/).length <= 5) return true;
  return false;
}

/**
 * Detailed replication prompt that instructs the AI to systematically
 * analyze an email screenshot/design and reproduce it as MJML.
 */
const REPLICATION_PROMPT = `You are looking at an email design that needs to be replicated as production-ready MJML/HTML. Follow this systematic process:

## STEP 1: ANALYZE THE LAYOUT (do this mentally, don't output)

Scan the image top-to-bottom. For each visual section, identify:
- **Section type**: header, hero, content block, feature grid, CTA, testimonial, footer, divider
- **Column structure**: full-width (1 col), 2-col, 3-col, 4-col
- **Background color**: extract the exact hex value from the image
- **Padding/spacing**: estimate the vertical padding between sections and horizontal margins

## STEP 2: EXTRACT COLORS (critical for accuracy)

Look at every distinct color in the design and note:
- Background colors for each section (look carefully at subtle grays, off-whites)
- Text colors (headings vs body vs secondary text — they're often different)
- Button/CTA colors (background AND text)
- Link colors
- Border/divider colors
- Use exact hex values where possible — don't default to generic colors

## STEP 3: ANALYZE TYPOGRAPHY

For each text element, note:
- **Size**: approximate pixel size (headlines are typically 24-36px, body 14-16px, small text 11-13px)
- **Weight**: bold, semibold, regular, light
- **Line height**: tight (1.2), normal (1.5), relaxed (1.8)
- **Alignment**: left, center, right
- **Font family**: serif vs sans-serif (use web-safe equivalents: Arial/Helvetica for sans, Georgia/Times for serif)
- **Letter spacing**: any visible tracking adjustments
- **Text transform**: uppercase, normal

## STEP 4: IDENTIFY COMPONENTS

For each section, map to MJML components:
- Images → \`<mj-image>\` with correct width, alt text
- Text blocks → \`<mj-text>\` with inline styles matching the design
- Buttons → \`<mj-button>\` with matching padding, border-radius, colors
- Dividers → \`<mj-divider>\` with matching color, width, padding
- Social icons → \`<mj-social>\` elements
- Spacers → \`<mj-spacer>\`

## STEP 5: BUILD THE MJML

Output the complete MJML with:
- Every section wrapped in its own \`<mj-section>\` with the correct background-color
- Inline styles on every element matching the original design
- Proper padding values that approximate the original spacing
- All text content copied exactly from the image (read every word carefully)
- Images use placeholder URLs (placehold.co) with dimensions matching the original proportions
- Footer MUST be its own separate \`<mj-section>\` block

## ACCURACY RULES

- **Colors**: Get them right. A light gray (#f5f5f5) is NOT the same as white (#ffffff). Look closely.
- **Spacing**: Match the visual rhythm. If sections have generous padding, use 40-60px. If tight, use 10-20px.
- **Typography hierarchy**: Headlines should visually dominate body text — match the size ratio.
- **Button styling**: Match border-radius (square corners = 0px, slightly rounded = 4-6px, pill = 25-50px), padding, and size.
- **Content width**: Email body is 600px wide. Content within sections is typically 540-560px (20-30px side padding).
- **Read ALL text**: Every heading, paragraph, label, link, footer line — read it from the image and include it verbatim.
- **Don't invent content**: Only include text that's visible in the image. Don't add sections that aren't there.
- **Don't skip sections**: If you can see it in the image, it must be in the MJML output.`;

/**
 * Simple asset-insertion hint when the user is providing an image
 * to use within an existing email (not replicating a design).
 */
const ASSET_HINT = (imageUrl: string) =>
  `\n\n[The uploaded image is hosted at: ${imageUrl} — use this exact URL as the src when placing this image in the email HTML.]`;

export function buildVisionMessage(
  imageUrl: string,
  userText: string
): Anthropic.MessageParam {
  const replicate = isReplicationRequest(userText);

  let text: string;
  if (replicate) {
    // Replication mode: detailed analysis prompt + user's text
    text = REPLICATION_PROMPT;
    if (userText) {
      text += `\n\n## USER INSTRUCTIONS\n${userText}`;
    }
    text += `\n\nIMPORTANT: Output a brief analysis summary (layout, colors, key design choices) followed by the complete MJML code. Do NOT ask clarification questions — go straight to building.`;
  } else {
    // Asset mode: user wants to insert this image into an email
    text = (userText || "Use this image in the email.") + ASSET_HINT(imageUrl);
  }

  return {
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "url",
          url: imageUrl,
        },
      },
      {
        type: "text",
        text,
      },
    ],
  };
}
