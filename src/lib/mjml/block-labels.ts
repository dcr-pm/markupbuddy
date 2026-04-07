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
 * Inject block label CSS + overlay styles into compiled HTML.
 * Uses ::before pseudo-elements positioned at the top of each block.
 */
export function injectBlockLabels(
  html: string,
  blockMap: BlockMap
): string {
  if (Object.keys(blockMap).length === 0) return html;

  const labelRules = Object.entries(blockMap)
    .map(
      ([num, name]) =>
        `.mb-block-${num} { position: relative !important; }
.mb-block-${num}::before {
  content: "${num}: ${name.replace(/"/g, '\\"')}";
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(99, 102, 241, 0.9);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  font-family: -apple-system, system-ui, sans-serif;
  padding: 2px 8px;
  border-radius: 4px;
  z-index: 100;
  pointer-events: none;
  line-height: 16px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}`
    )
    .join("\n");

  const styleBlock = `<style id="mb-block-labels">\n${labelRules}\n</style>`;

  // Inject before </head> if present, otherwise before </body> or at end
  if (html.includes("</head>")) {
    return html.replace("</head>", `${styleBlock}\n</head>`);
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `${styleBlock}\n</body>`);
  }
  return html + styleBlock;
}
