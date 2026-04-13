/**
 * Email quality validators — deterministic checks run after MJML compilation.
 * These validate the MJML source and compiled HTML for common issues.
 */

export interface ValidationIssue {
  type: "compile" | "contrast" | "alt_text" | "size" | "links" | "layout";
  severity: "error" | "warning";
  message: string;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  issues: ValidationIssue[];
}

// --- Color utilities ---

const COLOR_NAMES: Record<string, string> = {
  white: "#ffffff", black: "#000000", red: "#ff0000", blue: "#0000ff",
  green: "#008000", yellow: "#ffff00", orange: "#ffa500", purple: "#800080",
  gray: "#808080", grey: "#808080", navy: "#000080", teal: "#008080",
  maroon: "#800000", silver: "#c0c0c0", aqua: "#00ffff", fuchsia: "#ff00ff",
  transparent: "",
};

function parseColor(color: string): [number, number, number] | null {
  color = color.trim().toLowerCase();
  if (color === "transparent" || color === "inherit" || color === "initial") return null;
  if (COLOR_NAMES[color]) color = COLOR_NAMES[color];
  if (!color) return null;

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }

  // Handle hex
  if (!color.startsWith("#")) return null;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(
  c1: [number, number, number],
  c2: [number, number, number]
): number {
  const l1 = relativeLuminance(...c1);
  const l2 = relativeLuminance(...c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// --- Validators ---

/**
 * Check contrast on mj-button elements (background-color vs color on same tag).
 */
function checkButtonContrast(mjml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const buttonRegex = /<mj-button[^>]*>/gi;
  let match;
  while ((match = buttonRegex.exec(mjml)) !== null) {
    const tag = match[0];
    const bgMatch = tag.match(/background-color="([^"]+)"/i);
    const colorMatch = tag.match(/\bcolor="([^"]+)"/i);
    if (bgMatch && colorMatch) {
      const bg = parseColor(bgMatch[1]);
      const fg = parseColor(colorMatch[1]);
      if (bg && fg) {
        const ratio = contrastRatio(bg, fg);
        if (ratio < 4.5) {
          issues.push({
            type: "contrast",
            severity: "error",
            message: `Button has low contrast (${ratio.toFixed(1)}:1) between text "${colorMatch[1]}" and background "${bgMatch[1]}". Minimum is 4.5:1.`,
          });
        }
      }
    }
  }
  return issues;
}

/**
 * Check contrast on mj-text elements against their parent mj-section background.
 * Only checks mj-text tags with explicit color attributes.
 */
function checkTextContrast(mjml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Find sections with background colors and their text children
  const sectionRegex =
    /<mj-section[^>]*background-color="([^"]+)"[^>]*>([\s\S]*?)(?=<mj-section[\s>]|<\/mj-body>|$)/gi;
  let sectionMatch;
  while ((sectionMatch = sectionRegex.exec(mjml)) !== null) {
    const sectionBg = parseColor(sectionMatch[1]);
    if (!sectionBg) continue;
    const sectionContent = sectionMatch[2];

    // Find mj-text with explicit color
    const textRegex = /<mj-text[^>]*\bcolor="([^"]+)"[^>]*>/gi;
    let textMatch;
    while ((textMatch = textRegex.exec(sectionContent)) !== null) {
      const textColor = parseColor(textMatch[1]);
      if (!textColor) continue;
      const ratio = contrastRatio(sectionBg, textColor);
      if (ratio < 4.5) {
        issues.push({
          type: "contrast",
          severity: "error",
          message: `Text color "${textMatch[1]}" on section background "${sectionMatch[1]}" has low contrast (${ratio.toFixed(1)}:1). Minimum is 4.5:1.`,
        });
      }
    }
  }
  return issues;
}

/**
 * Audit alt text on images in MJML source.
 */
function auditAltText(mjml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const imgRegex = /<mj-image[^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(mjml)) !== null) {
    const tag = match[0];
    const altMatch = tag.match(/\balt="([^"]*)"/i);
    if (!altMatch) {
      issues.push({
        type: "alt_text",
        severity: "warning",
        message: "Image missing alt attribute.",
      });
    } else if (
      altMatch[1] &&
      /^(image|photo|picture|img|icon|logo|banner)$/i.test(altMatch[1].trim())
    ) {
      issues.push({
        type: "alt_text",
        severity: "warning",
        message: `Image has generic alt text: "${altMatch[1]}". Use descriptive text.`,
      });
    }
  }
  return issues;
}

/**
 * Check compiled HTML size against Gmail's 102KB clipping threshold.
 */
function checkEmailSize(compiledHtml: string): ValidationIssue[] {
  const sizeBytes = new TextEncoder().encode(compiledHtml).length;
  const sizeKb = sizeBytes / 1024;
  if (sizeKb > 102) {
    return [
      {
        type: "size",
        severity: "error",
        message: `Email is ${Math.round(sizeKb)}KB — exceeds Gmail's 102KB clipping limit.`,
      },
    ];
  }
  if (sizeKb > 80) {
    return [
      {
        type: "size",
        severity: "warning",
        message: `Email is ${Math.round(sizeKb)}KB — approaching Gmail's 102KB clipping limit.`,
      },
    ];
  }
  return [];
}

/**
 * Audit links in MJML source.
 */
function auditLinks(mjml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for empty/hash hrefs
  const hrefRegex = /href="([^"]*)"/gi;
  let match;
  while ((match = hrefRegex.exec(mjml)) !== null) {
    const href = match[1].trim();
    if (href === "#" || href === "") {
      issues.push({
        type: "links",
        severity: "warning",
        message: "Found empty or # href — use a placeholder URL like https://example.com.",
      });
    } else if (href.startsWith("http://") && !href.startsWith("http://schemas.")) {
      issues.push({
        type: "links",
        severity: "warning",
        message: `Link uses http:// instead of https://: "${href.slice(0, 60)}".`,
      });
    }
  }

  // Check for "click here" link text
  if (/>\s*click\s+here\s*</i.test(mjml)) {
    issues.push({
      type: "links",
      severity: "warning",
      message: 'Found "click here" link text — use descriptive action text instead.',
    });
  }

  return issues;
}

/**
 * Check for layout issues that cause text overlap:
 * - mj-image inside a section with background-url (causes overlap)
 * - mj-text without padding (causes text to collide)
 */
function checkLayout(mjml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Detect mj-image inside a section that has background-url — causes text/image overlap
  const sectionRegex =
    /<mj-section[^>]*background-url="[^"]*"[^>]*>([\s\S]*?)(?=<mj-section[\s>]|<\/mj-body>|$)/gi;
  let sMatch;
  while ((sMatch = sectionRegex.exec(mjml)) !== null) {
    const content = sMatch[1];
    if (/<mj-image\b/i.test(content)) {
      issues.push({
        type: "layout",
        severity: "error",
        message:
          "Section with background-url contains <mj-image> — this causes text/image overlap. Use background-url for background images OR <mj-image> for inline images, never both in the same section.",
      });
    }
  }

  // Detect mj-text without any padding attribute (risky for overlap)
  const textNoPadRegex = /<mj-text(?![^>]*padding)[^>]*>/gi;
  let tMatch;
  let noPadCount = 0;
  while ((tMatch = textNoPadRegex.exec(mjml)) !== null) {
    // Skip if it's inside mj-attributes (global defaults)
    const before = mjml.slice(0, tMatch.index);
    if (/<mj-attributes[^>]*>[^]*$/i.test(before) && !/<\/mj-attributes>/i.test(before.slice(before.lastIndexOf("<mj-attributes")))) continue;
    noPadCount++;
  }
  if (noPadCount > 2) {
    issues.push({
      type: "layout",
      severity: "warning",
      message: `${noPadCount} <mj-text> elements have no explicit padding — this can cause text to overlap. Add padding="10px 20px" to each.`,
    });
  }

  // Detect mj-social without mode="horizontal" — causes ugly vertical stacking
  const socialRegex = /<mj-social\b[^>]*>/gi;
  let socialMatch;
  while ((socialMatch = socialRegex.exec(mjml)) !== null) {
    const tag = socialMatch[0];
    if (!/mode="horizontal"/i.test(tag)) {
      issues.push({
        type: "layout",
        severity: "error",
        message:
          '<mj-social> is missing mode="horizontal" — social icons will stack vertically. Add mode="horizontal" align="center" icon-size="24px".',
      });
    }
    // Check for missing align="center"
    if (!/align="center"/i.test(tag)) {
      issues.push({
        type: "layout",
        severity: "error",
        message:
          '<mj-social> is missing align="center" — social icons will be left-aligned. Add align="center".',
      });
    }
  }

  // Detect mj-social-element without text-mode="false" — shows ugly text labels
  const socialElRegex = /<mj-social-element\b[^>]*>/gi;
  let seMatch;
  while ((seMatch = socialElRegex.exec(mjml)) !== null) {
    const tag = seMatch[0];
    if (!/text-mode="false"/i.test(tag)) {
      issues.push({
        type: "layout",
        severity: "warning",
        message:
          '<mj-social-element> is missing text-mode="false" — will show text labels next to icons. Add text-mode="false".',
      });
      break; // One warning is enough
    }
  }

  return issues;
}

/**
 * Check that multi-column sections have balanced content.
 * Each column in a grid should have the same number and type of child elements.
 */
function checkColumnBalance(mjml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Find sections with multiple columns
  const sectionRegex =
    /<!--\s*Block\s+(\d+)\s*:[^>]*-->\s*<mj-section[^>]*>([\s\S]*?)<\/mj-section>/gi;
  let match;
  while ((match = sectionRegex.exec(mjml)) !== null) {
    const blockNum = match[1];
    const sectionContent = match[2];

    // Extract columns
    const columns: string[] = [];
    const colRegex = /<mj-column[^>]*>([\s\S]*?)<\/mj-column>/gi;
    let colMatch;
    while ((colMatch = colRegex.exec(sectionContent)) !== null) {
      columns.push(colMatch[1]);
    }

    // Only check sections with 2+ columns
    if (columns.length < 2) continue;

    // Count child elements in each column
    const elementCounts = columns.map((col) => {
      const elements = col.match(/<mj-(text|image|button|divider|spacer|social)\b/gi);
      return elements ? elements.length : 0;
    });

    const maxCount = Math.max(...elementCounts);
    const minCount = Math.min(...elementCounts);

    if (maxCount - minCount > 1) {
      issues.push({
        type: "layout",
        severity: "error",
        message: `Block ${blockNum}: columns are unbalanced (${elementCounts.join(", ")} elements). Each column in a ${columns.length}-column grid must have the same number and type of elements.`,
      });
    }
  }

  // Also check sections without block comments (fallback)
  const plainSectionRegex =
    /<mj-section[^>]*>([\s\S]*?)<\/mj-section>/gi;
  let plainMatch;
  const checkedRanges: Array<[number, number]> = [];
  // Track ranges already covered by block-comment sections
  sectionRegex.lastIndex = 0;
  while ((match = sectionRegex.exec(mjml)) !== null) {
    checkedRanges.push([match.index, match.index + match[0].length]);
  }

  while ((plainMatch = plainSectionRegex.exec(mjml)) !== null) {
    // Skip if already checked via block comment path
    const pos = plainMatch.index;
    if (checkedRanges.some(([s, e]) => pos >= s && pos < e)) continue;

    const sectionContent = plainMatch[1];
    const columns: string[] = [];
    const colRegex2 = /<mj-column[^>]*>([\s\S]*?)<\/mj-column>/gi;
    let colMatch2;
    while ((colMatch2 = colRegex2.exec(sectionContent)) !== null) {
      columns.push(colMatch2[1]);
    }

    if (columns.length < 2) continue;

    const elementCounts = columns.map((col) => {
      const elements = col.match(/<mj-(text|image|button|divider|spacer|social)\b/gi);
      return elements ? elements.length : 0;
    });

    const maxCount = Math.max(...elementCounts);
    const minCount = Math.min(...elementCounts);

    if (maxCount - minCount > 1) {
      issues.push({
        type: "layout",
        severity: "error",
        message: `Multi-column section has unbalanced columns (${elementCounts.join(", ")} elements). Each column must have the same number of elements.`,
      });
    }
  }

  return issues;
}

/**
 * Check for duplicate CTA buttons within the same section.
 * Multiple buttons with identical text in a grid look broken.
 */
function checkDuplicateCTAs(mjml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const sectionRegex =
    /(?:<!--\s*Block\s+(\d+)\s*:[^>]*-->\s*)?<mj-section[^>]*>([\s\S]*?)<\/mj-section>/gi;
  let match;
  while ((match = sectionRegex.exec(mjml)) !== null) {
    const blockNum = match[1] || "?";
    const content = match[2];

    // Only check multi-column sections
    const colCount = (content.match(/<mj-column\b/gi) || []).length;
    if (colCount < 2) continue;

    // Extract button text
    const buttonTexts: string[] = [];
    const btnRegex = /<mj-button[^>]*>([\s\S]*?)<\/mj-button>/gi;
    let btnMatch;
    while ((btnMatch = btnRegex.exec(content)) !== null) {
      const text = btnMatch[1].replace(/<[^>]+>/g, "").trim().toLowerCase();
      if (text) buttonTexts.push(text);
    }

    // Find duplicates
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const t of buttonTexts) {
      if (seen.has(t)) dupes.add(t);
      seen.add(t);
    }

    if (dupes.size > 0) {
      issues.push({
        type: "layout",
        severity: "error",
        message: `Block ${blockNum}: duplicate CTA buttons with text "${[...dupes].join('", "')}" across columns. Each column should have unique CTA text, or use a single full-width button below the grid.`,
      });
    }
  }

  return issues;
}

/**
 * Verify the footer is the last section before </mj-body>.
 * Footer content inside other sections breaks the layout.
 */
function checkFooterPlacement(mjml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Find block comments that mention "footer"
  const footerBlockRegex = /<!--\s*Block\s+(\d+)\s*:\s*([^-]*footer[^-]*?)-->/gi;
  let footerMatch;
  const footerBlocks: Array<{ number: number; index: number }> = [];

  while ((footerMatch = footerBlockRegex.exec(mjml)) !== null) {
    footerBlocks.push({
      number: parseInt(footerMatch[1]),
      index: footerMatch.index,
    });
  }

  if (footerBlocks.length === 0) return issues; // No labeled footer

  // The footer should be the last block
  const lastFooter = footerBlocks[footerBlocks.length - 1];
  const afterFooter = mjml.slice(lastFooter.index);

  // Check if there's another non-footer section after the footer
  const sectionsAfter = afterFooter.match(/<!--\s*Block\s+(\d+)\s*:\s*([^-]*?)-->/gi);
  if (sectionsAfter && sectionsAfter.length > 1) {
    // More than 1 means there are blocks after the footer block
    const nonFooterAfter = sectionsAfter.filter(
      (s) => !/footer/i.test(s) && s !== sectionsAfter[0]
    );
    if (nonFooterAfter.length > 0) {
      issues.push({
        type: "layout",
        severity: "error",
        message: `Footer (Block ${lastFooter.number}) is not the last section. Content blocks appear after the footer, which breaks the email layout.`,
      });
    }
  }

  return issues;
}

/**
 * Run all validators on MJML source and compiled HTML.
 * Returns a structured result with individual check outcomes.
 */
export function validateEmail(
  mjml: string,
  compiledHtml: string
): ValidationResult {
  const allIssues: ValidationIssue[] = [];

  // Run validators
  const contrastIssues = [
    ...checkButtonContrast(mjml),
    ...checkTextContrast(mjml),
  ];
  const altTextIssues = auditAltText(mjml);
  const sizeIssues = checkEmailSize(compiledHtml);
  const linkIssues = auditLinks(mjml);
  const layoutIssues = [
    ...checkLayout(mjml),
    ...checkColumnBalance(mjml),
    ...checkDuplicateCTAs(mjml),
    ...checkFooterPlacement(mjml),
  ];

  allIssues.push(...contrastIssues, ...altTextIssues, ...sizeIssues, ...linkIssues, ...layoutIssues);

  const checks: ValidationCheck[] = [
    {
      name: "Compiled",
      passed: true,
      detail: "Email compiled successfully",
    },
    {
      name: "Contrast",
      passed: contrastIssues.length === 0,
      detail:
        contrastIssues.length === 0
          ? "All colors pass WCAG 4.5:1"
          : `${contrastIssues.length} contrast issue(s)`,
    },
    {
      name: "Alt text",
      passed: altTextIssues.length === 0,
      detail:
        altTextIssues.length === 0
          ? "All images have descriptive alt text"
          : `${altTextIssues.length} image(s) need better alt text`,
    },
    {
      name: "Size",
      passed: sizeIssues.filter((i) => i.severity === "error").length === 0,
      detail: `${Math.round(new TextEncoder().encode(compiledHtml).length / 1024)}KB`,
    },
    {
      name: "Links",
      passed: linkIssues.length === 0,
      detail:
        linkIssues.length === 0
          ? "All links are valid"
          : `${linkIssues.length} link issue(s)`,
    },
    {
      name: "Layout",
      passed: layoutIssues.filter((i) => i.severity === "error").length === 0,
      detail:
        layoutIssues.length === 0
          ? "No overlap or stacking issues"
          : `${layoutIssues.length} layout issue(s)`,
    },
  ];

  return {
    passed: allIssues.filter((i) => i.severity === "error").length === 0,
    checks,
    issues: allIssues,
  };
}

/**
 * Check if validation issues are worth retrying with the LLM.
 * Retries for errors (compile, contrast, layout) AND fixable warnings (alt_text, links).
 */
export function shouldRetry(issues: ValidationIssue[]): boolean {
  return issues.some(
    (i) =>
      (i.severity === "error" && (i.type === "compile" || i.type === "contrast" || i.type === "layout")) ||
      (i.type === "alt_text" || i.type === "links")
  );
}

/** Fix instruction hints for each issue type */
const FIX_HINTS: Record<string, string> = {
  contrast:
    "Fix: Change the text color to #FFFFFF (or a light color) if the background is dark, or lighten the background if the text is dark. Ensure a contrast ratio of at least 4.5:1.",
  layout_balance:
    "Fix: Ensure every column in this section has the exact same number and type of elements. If column 1 has image+text+button, ALL other columns must also have image+text+button.",
  layout_duplicate_cta:
    "Fix: Give each column a unique CTA button text (e.g., 'Shop Shoes', 'Shop Bags'), or remove duplicate buttons and use a single full-width <mj-button> below the multi-column section.",
  layout_footer:
    "Fix: Move the footer to be the very last <mj-section> before </mj-body>. The footer must be its own independent section — never combined with other content.",
  layout_overlap:
    "Fix: Remove <mj-image> from any section that uses background-url. Use background-url for background images OR <mj-image> for inline images, never both.",
  layout_social:
    'Fix: Add mode="horizontal" align="center" icon-size="24px" to <mj-social>, and text-mode="false" to each <mj-social-element>.',
  alt_text:
    'Fix: Add a descriptive alt attribute to each image. Example: alt="Woman wearing red summer dress - $49.99". Never use generic text like "image" or "icon".',
  links:
    'Fix: Replace href="#" with a meaningful placeholder URL like https://example.com/action. Use https:// instead of http://. Replace "click here" with descriptive action text.',
};

/**
 * Format issues with actionable fix instructions for the LLM correction prompt.
 */
export function formatIssuesForLLM(issues: ValidationIssue[]): string {
  const retryable = issues.filter(
    (i) =>
      i.severity === "error" ||
      i.type === "alt_text" ||
      i.type === "links"
  );

  return retryable
    .map((i) => {
      let hint = "";
      if (i.type === "contrast") hint = FIX_HINTS.contrast;
      else if (i.type === "layout" && /unbalanced|balance/i.test(i.message)) hint = FIX_HINTS.layout_balance;
      else if (i.type === "layout" && /duplicate.*cta/i.test(i.message)) hint = FIX_HINTS.layout_duplicate_cta;
      else if (i.type === "layout" && /footer/i.test(i.message)) hint = FIX_HINTS.layout_footer;
      else if (i.type === "layout" && /overlap|background-url/i.test(i.message)) hint = FIX_HINTS.layout_overlap;
      else if (i.type === "layout" && /social/i.test(i.message)) hint = FIX_HINTS.layout_social;
      else if (i.type === "alt_text") hint = FIX_HINTS.alt_text;
      else if (i.type === "links") hint = FIX_HINTS.links;

      return `- [${i.type.toUpperCase()}] ${i.message}${hint ? `\n  ${hint}` : ""}`;
    })
    .join("\n");
}
