/**
 * Block label utilities for the preview.
 * Injects CSS classes into MJML sections and generates
 * overlay labels in compiled HTML for visual block identification.
 */

export interface BlockMap {
  [blockNumber: number]: string;
}

/**
 * Extract block number→name mapping from MJML source.
 * Parses <!-- Block N: Name --> comments.
 */
export function extractBlockMap(mjml: string): BlockMap {
  const map: BlockMap = {};
  const matches = mjml.matchAll(/<!--\s*Block\s+(\d+)\s*:\s*(.+?)-->/gi);
  for (const match of matches) {
    map[parseInt(match[1])] = match[2].trim();
  }
  return map;
}

/**
 * Inject css-class="mb-block-N" into each <mj-section> that follows
 * a <!-- Block N --> comment. This ensures the compiled HTML has
 * classes we can target with CSS labels.
 */
export function injectBlockClasses(mjml: string): string {
  return mjml.replace(
    /<!--\s*Block\s+(\d+)\s*:.*?-->\s*<mj-section([^>]*?)>/gi,
    (full, num, attrs) => {
      // If section already has css-class, append to it; otherwise add new attr
      const blockClass = `mb-block mb-block-${num}`;
      if (/css-class\s*=\s*"/i.test(attrs)) {
        const updated = attrs.replace(
          /css-class\s*=\s*"/i,
          `css-class="${blockClass} `
        );
        return full.replace(
          `<mj-section${attrs}>`,
          `<mj-section${updated}>`
        );
      }
      return full.replace(
        `<mj-section${attrs}>`,
        `<mj-section css-class="${blockClass}"${attrs}>`
      );
    }
  );
}

/**
 * Inject block label overlays into compiled HTML.
 * Finds <!-- Block N: Name --> comments (preserved by MJML compiler)
 * and inserts small inline label divs after each one.
 * Falls back to blockMap if provided for cases where comments are stripped.
 */
export function injectBlockLabels(
  html: string,
  blockMap: BlockMap,
  showActions: boolean = false
): string {
  // Extract block map from HTML comments if blockMap is empty
  const map = Object.keys(blockMap).length > 0 ? blockMap : extractBlockMap(html);
  if (Object.keys(map).length === 0) return html;

  const blockNumbers = Object.keys(map).map(Number).sort((a, b) => a - b);
  const maxBlock = blockNumbers[blockNumbers.length - 1];
  const minBlock = blockNumbers[0];

  const labelStyle = `display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.9);color:#fff;font-size:10px;font-weight:600;font-family:-apple-system,system-ui,sans-serif;padding:2px 8px;border-radius:4px;line-height:16px;letter-spacing:0.02em;margin:4px 0 0 4px;`;
  const btnStyle = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:none;background:rgba(255,255,255,0.2);color:#fff;border-radius:3px;cursor:pointer;font-size:11px;padding:0;margin:0;line-height:1;font-family:-apple-system,system-ui,sans-serif;`;

  let result = html;
  // Insert a label div after each block comment
  for (const [numStr, name] of Object.entries(map)) {
    const num = parseInt(numStr);
    const commentRegex = new RegExp(
      `(<!--\\s*Block\\s+${num}\\s*:[^>]*-->)`,
      "i"
    );

    let actions = "";
    const isStructural = /^(view in browser|footer)$/i.test(name);
    if (showActions && !isStructural) {
      const upBtn = num > minBlock
        ? `<button data-block-action="move-up" data-block-num="${num}" style="${btnStyle}" title="Move up">\u2191</button>`
        : "";
      const downBtn = num < maxBlock
        ? `<button data-block-action="move-down" data-block-num="${num}" style="${btnStyle}" title="Move down">\u2193</button>`
        : "";
      const deleteBtn = blockNumbers.length > 1
        ? `<button data-block-action="delete" data-block-num="${num}" style="${btnStyle}background:rgba(239,68,68,0.7);" title="Delete block">\u2715</button>`
        : "";
      actions = `<span style="display:inline-flex;gap:2px;margin-left:4px;">${upBtn}${downBtn}${deleteBtn}</span>`;
    }

    const nameSpan = `<span data-block-name data-block-num="${num}" contenteditable="true" style="outline:none;cursor:text;border-bottom:1px dashed rgba(255,255,255,0.3);min-width:20px;" spellcheck="false">${name.replace(/"/g, "&quot;")}</span>`;
    const label = `<div data-block-label="true" style="${labelStyle}">${num}: ${nameSpan}${actions}</div>`;
    result = result.replace(commentRegex, `$1\n${label}`);
  }

  return result;
}

/**
 * Rename a block in compiled HTML by updating its comment.
 */
export function renameBlockInHtml(html: string, blockNumber: number, newName: string): string {
  const regex = new RegExp(
    `(<!--\\s*Block\\s+${blockNumber}\\s*:).*?(--)`,
    "i"
  );
  return html.replace(regex, `$1 ${newName} $2`);
}

/**
 * Delete a block from compiled HTML by removing the section between
 * its block comment and the next block comment (or end of body).
 */
export function deleteBlockFromHtml(html: string, blockNumber: number): string {
  const startRegex = new RegExp(
    `<!--\\s*Block\\s+${blockNumber}\\s*:[^>]*-->`,
    "i"
  );
  const startMatch = startRegex.exec(html);
  if (!startMatch) return html;

  const startPos = startMatch.index;
  const afterStart = html.slice(startPos + startMatch[0].length);

  // Find end: next block comment or </body>
  const nextBlockMatch = afterStart.match(/<!--\s*Block\s+\d+\s*:/i);
  const bodyCloseMatch = afterStart.match(/<\/body>/i);

  let endOffset: number;
  if (nextBlockMatch && (!bodyCloseMatch || nextBlockMatch.index! < bodyCloseMatch.index!)) {
    endOffset = nextBlockMatch.index!;
  } else if (bodyCloseMatch) {
    endOffset = bodyCloseMatch.index!;
  } else {
    return html;
  }

  const endPos = startPos + startMatch[0].length + endOffset;
  return html.slice(0, startPos) + html.slice(endPos);
}

/**
 * Swap two adjacent blocks in compiled HTML.
 */
export function swapBlocksInHtml(
  html: string,
  blockNumA: number,
  blockNumB: number
): string {
  const extractBlock = (h: string, num: number): { start: number; end: number; content: string } | null => {
    const regex = new RegExp(`<!--\\s*Block\\s+${num}\\s*:[^>]*-->`, "i");
    const match = regex.exec(h);
    if (!match) return null;

    const start = match.index;
    const after = h.slice(start + match[0].length);
    const nextBlock = after.match(/<!--\s*Block\s+\d+\s*:/i);
    const bodyClose = after.match(/<\/body>/i);

    let endOffset: number;
    if (nextBlock && (!bodyClose || nextBlock.index! < bodyClose.index!)) {
      endOffset = nextBlock.index!;
    } else if (bodyClose) {
      endOffset = bodyClose.index!;
    } else {
      return null;
    }

    const end = start + match[0].length + endOffset;
    return { start, end, content: h.slice(start, end) };
  };

  const blockA = extractBlock(html, blockNumA);
  const blockB = extractBlock(html, blockNumB);
  if (!blockA || !blockB) return html;

  // Ensure A comes before B
  const first = blockA.start < blockB.start ? blockA : blockB;
  const second = blockA.start < blockB.start ? blockB : blockA;

  return (
    html.slice(0, first.start) +
    second.content +
    html.slice(first.end, second.start) +
    first.content +
    html.slice(second.end)
  );
}
