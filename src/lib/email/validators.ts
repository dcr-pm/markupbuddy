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
  const layoutIssues = checkLayout(mjml);

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
 * Only retries for compile errors and contrast errors — not warnings.
 */
export function shouldRetry(issues: ValidationIssue[]): boolean {
  return issues.some(
    (i) => i.severity === "error" && (i.type === "compile" || i.type === "contrast" || i.type === "layout")
  );
}

/**
 * Format issues into a concise message for the LLM correction prompt.
 */
export function formatIssuesForLLM(issues: ValidationIssue[]): string {
  return issues
    .filter((i) => i.severity === "error")
    .map((i) => `- [${i.type.toUpperCase()}] ${i.message}`)
    .join("\n");
}
