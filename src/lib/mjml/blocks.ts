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
    /<!--\s*Block\s+\d+\s*:/i.test(content) &&
    /<mj-section[\s>]/i.test(content)
  );
}

/**
 * Extract blocks from a partial edit response.
 * Returns array of blocks with their number, name, and full content.
 */
export function extractBlocksFromPartial(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const blockStarts = [
    ...content.matchAll(/<!--\s*Block\s+(\d+)\s*:\s*([^-]+?)-->/gi),
  ];

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
        name: match[2].trim(),
        content: blockContent,
      });
    }
  }

  return blocks;
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

  for (const block of updatedBlocks) {
    result = replaceBlock(result, block.number, block.content);
  }

  return result;
}

function replaceBlock(
  mjml: string,
  blockNumber: number,
  newContent: string
): string {
  // Find the start of this block: <!-- Block N: ... -->
  const startRegex = new RegExp(
    `<!--\\s*Block\\s+${blockNumber}\\s*:[^>]*-->`,
    "i"
  );
  const startMatch = startRegex.exec(mjml);
  if (!startMatch) return mjml; // Block not found, return unchanged

  const startPos = startMatch.index;

  // Find the end: next <!-- Block N+M --> or </mj-body>
  const afterStart = mjml.slice(startPos + startMatch[0].length);
  const nextBlockMatch = afterStart.match(/<!--\s*Block\s+\d+\s*:/i);
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
