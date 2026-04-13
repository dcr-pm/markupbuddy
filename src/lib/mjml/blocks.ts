/**
 * MJML block-level parsing and splicing.
 * Enables partial edits — AI outputs only changed blocks,
 * server splices them into the last full MJML before compiling.
 */

interface ParsedBlock {
  number: number;
  name: string;
  content: string; // Full block including comment + <mj-section>...</mj-section>
}

/**
 * Check if AI output is a partial block edit (not a full email).
 * Partial = has <!-- Block N --> and <mj-section> but NOT <mjml> wrapper.
 */
export function isPartialBlockEdit(content: string): boolean {
  if (/<mjml[\s>]/i.test(content)) return false;
  return (
    BLOCK_COMMENT_REGEX.test(content) &&
    /<mj-section[\s>]/i.test(content)
  );
}

// Permissive block comment regex — allows missing colons, variable whitespace, optional trailing text
const BLOCK_COMMENT_REGEX = /<!--\s*Block\s+(\d+)\s*[:\-—]?\s*([^-]*?)-->/gi;

/**
 * Extract blocks from a partial edit response.
 * Returns array of blocks with their number, name, and full content.
 */
export function extractBlocksFromPartial(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const regex = new RegExp(BLOCK_COMMENT_REGEX.source, "gi");
  const blockStarts = [...content.matchAll(regex)];

  for (let i = 0; i < blockStarts.length; i++) {
    const match = blockStarts[i];
    const startPos = match.index!;

    // End is the next block comment or end of content
    const endPos =
      i < blockStarts.length - 1
        ? blockStarts[i + 1].index!
        : content.length;

    const blockContent = content.slice(startPos, endPos).trim();

    // Only include if it actually has section content
    if (/<mj-section[\s>]/i.test(blockContent)) {
      blocks.push({
        number: parseInt(match[1]),
        name: (match[2] || "").trim(),
        content: blockContent,
      });
    }
  }

  return blocks;
}

/**
 * Wrap a partial block edit in a full MJML document for standalone compilation.
 * Used as a fallback when splicing into existing MJML fails.
 */
export function wrapPartialAsFullMjml(partial: string): string {
  return `<mjml>\n<mj-body>\n${partial.trim()}\n</mj-body>\n</mjml>`;
}

/**
 * Splice updated blocks into a full MJML document.
 * Replaces each block by its number — finds the old block comment
 * and replaces everything until the next block comment or </mj-body>.
 */
export function spliceBlocks(
  fullMjml: string,
  updatedBlocks: ParsedBlock[]
): string {
  let result = fullMjml;
  let anyReplaced = false;

  for (const block of updatedBlocks) {
    const before = result;
    result = replaceBlock(result, block.number, block.content, block.name);
    if (result !== before) anyReplaced = true;
  }

  // If no blocks were replaced, log a warning — caller may need to fall back
  if (!anyReplaced && updatedBlocks.length > 0) {
    console.warn("[blocks] spliceBlocks: no blocks matched — splice had no effect");
  }

  return result;
}

function replaceBlock(
  mjml: string,
  blockNumber: number,
  newContent: string,
  blockName?: string
): string {
  // Try to find by block number first (permissive: colon optional)
  let startRegex = new RegExp(
    `<!--\\s*Block\\s+${blockNumber}\\s*[:\\-—]?[^>]*-->`,
    "i"
  );
  let startMatch = startRegex.exec(mjml);

  // Fallback: try matching by block name (case-insensitive substring)
  if (!startMatch && blockName) {
    const escapedName = blockName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = new RegExp(
      `<!--\\s*Block\\s+\\d+\\s*[:\\-—]?\\s*[^-]*${escapedName}[^-]*-->`,
      "i"
    );
    startMatch = nameRegex.exec(mjml);
    if (startMatch) {
      console.log(`[blocks] Block ${blockNumber} not found by number, matched by name "${blockName}"`);
    }
  }

  if (!startMatch) return mjml; // Block not found, return unchanged

  const startPos = startMatch.index;

  // Find the end: next block comment or </mj-body>
  const afterStart = mjml.slice(startPos + startMatch[0].length);
  const nextBlockMatch = afterStart.match(/<!--\s*Block\s+\d+\s*[:\-—]?/i);
  const bodyCloseMatch = afterStart.match(/<\/mj-body>/i);

  let endOffset: number;
  if (
    nextBlockMatch &&
    (!bodyCloseMatch || nextBlockMatch.index! < bodyCloseMatch.index!)
  ) {
    endOffset = nextBlockMatch.index!;
  } else if (bodyCloseMatch) {
    endOffset = bodyCloseMatch.index!;
  } else {
    return mjml; // Can't determine block end
  }

  const endPos = startPos + startMatch[0].length + endOffset;

  return (
    mjml.slice(0, startPos) +
    newContent.trim() +
    "\n\n" +
    mjml.slice(endPos)
  );
}
