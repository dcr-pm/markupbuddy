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
  const matches = mjml.matchAll(/<!--\s*Block\s+(\d+)\s*:\s*([^-]+?)-->/gi);
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
    /<!--\s*Block\s+(\d+)\s*:[^-]*-->\s*<mj-section([^>]*?)>/gi,
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
  blockMap: BlockMap
): string {
  // Extract block map from HTML comments if blockMap is empty
  const map = Object.keys(blockMap).length > 0 ? blockMap : extractBlockMap(html);
  if (Object.keys(map).length === 0) return html;

  const labelStyle = `display:inline-block;background:rgba(99,102,241,0.9);color:#fff;font-size:10px;font-weight:600;font-family:-apple-system,system-ui,sans-serif;padding:2px 8px;border-radius:4px;line-height:16px;letter-spacing:0.02em;margin:4px 0 0 4px;`;

  let result = html;
  // Insert a label div after each block comment
  for (const [num, name] of Object.entries(map)) {
    const commentRegex = new RegExp(
      `(<!--\\s*Block\\s+${num}\\s*:[^>]*-->)`,
      "i"
    );
    const label = `<div style="${labelStyle}">${num}: ${name.replace(/"/g, "&quot;")}</div>`;
    result = result.replace(commentRegex, `$1\n${label}`);
  }

  return result;
}
