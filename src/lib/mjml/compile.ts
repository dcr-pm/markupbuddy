interface CompileResult {
  html: string;
  errors: string[];
}

// Cache the dynamic import so we only load MJML once
let mjml2htmlCached: ((mjml: string, options: Record<string, unknown>) => { html: string; errors?: { formattedMessage: string }[] }) | null = null;

/**
 * Compile MJML markup to production-ready email HTML.
 * Uses dynamic import to avoid build-time file descriptor issues.
 */
export async function compileMjml(mjmlSource: string): Promise<CompileResult> {
  try {
    if (!mjml2htmlCached) {
      mjml2htmlCached = (await import("mjml")).default;
    }

    // Pre-process: auto-fix common MJML mistakes before compilation
    const fixedSource = fixSocialIcons(mjmlSource);

    const result = mjml2htmlCached!(fixedSource, {
      validationLevel: "soft",
      minify: false,
    });

    // Fix MJML's default lang="und" to lang="en"
    let html = result.html.replace(/lang="und"/g, 'lang="en"');

    // Post-process: fix footer link colors on dark backgrounds
    html = fixFooterLinks(html);

    return {
      html,
      errors: result.errors?.map((e: { formattedMessage: string }) => e.formattedMessage) || [],
    };
  } catch (error) {
    return {
      html: "",
      errors: [error instanceof Error ? error.message : "MJML compilation failed"],
    };
  }
}

/**
 * Check if a string contains MJML markup (vs raw HTML).
 */
export function isMjml(content: string): boolean {
  return /<mjml[\s>]/i.test(content) || /<mj-/i.test(content);
}

/**
 * Pre-process MJML source to fix common social icon mistakes.
 * Ensures <mj-social> has mode="horizontal" and align="center",
 * and <mj-social-element> has text-mode="false".
 * This runs before compilation so the output is always correct.
 */
function fixSocialIcons(mjml: string): string {
  // Fix <mj-social-element> missing text-mode="false" (must run BEFORE mj-social fix)
  let result = mjml.replace(/<mj-social-element\b([^>]*)>/gi, (full, attrs: string) => {
    if (!/text-mode="/i.test(attrs)) {
      return `<mj-social-element${attrs} text-mode="false">`;
    }
    return full;
  });

  // Fix <mj-social> (but NOT mj-social-element) missing mode="horizontal"
  result = result.replace(/<mj-social(?!-element)\b([^>]*)>/gi, (full, attrs: string) => {
    let fixed = attrs;
    if (!/mode="/i.test(fixed)) {
      fixed += ' mode="horizontal"';
    }
    if (!/align="/i.test(fixed)) {
      fixed += ' align="center"';
    }
    if (!/icon-size="/i.test(fixed)) {
      fixed += ' icon-size="24px"';
    }
    return `<mj-social${fixed}>`;
  });

  return result;
}

/**
 * Post-process compiled HTML to fix footer link colors.
 *
 * The AI sometimes omits inline color on footer <a> tags, or uses dark
 * colors on dark backgrounds. Email clients (especially Gmail) strip
 * <style> blocks, so links revert to default blue (#0000EE) which is
 * unreadable on dark footer backgrounds.
 *
 * This function finds the last section (typically the footer) and ensures
 * all <a> tags inside it have proper inline color + text-decoration styles
 * when the section has a dark background.
 */
function fixFooterLinks(html: string): string {
  // Find the last mb-block section (footer is always last)
  const lastBlockMatch = html.match(
    /(<div\s+class="mb-block\s+mb-block-\d+"[^>]*style="[^"]*background[^"]*"[^>]*>)([\s\S]*?)(<\/div>\s*<!--\[if\s+mso\s*\|\s*IE\]>.*?<!\[endif\]-->\s*<\/div>\s*<\/body>)/i
  );
  if (!lastBlockMatch) return html;

  const sectionTag = lastBlockMatch[1];
  const sectionContent = lastBlockMatch[2];
  const sectionEnd = lastBlockMatch[3];

  // Check if the footer has a dark background
  const bgMatch = sectionTag.match(/background(?:-color)?:\s*([^;"]+)/i);
  if (!bgMatch) return html;
  const bg = bgMatch[1].trim().toLowerCase();
  if (!isDarkColor(bg)) return html;

  // Fix all <a> tags in this section that lack proper inline color
  const fixedContent = sectionContent.replace(
    /<a\s([^>]*?)>/gi,
    (fullMatch, attrs: string) => {
      const styleMatch = attrs.match(/style="([^"]*)"/i);
      const existingStyle = styleMatch ? styleMatch[1] : "";

      // Check if color is already light enough
      const colorMatch = existingStyle.match(/(?:^|;)\s*color:\s*([^;]+)/i);
      if (colorMatch) {
        const color = colorMatch[1].trim().toLowerCase();
        // If it already has a light color, leave it alone
        if (isLightColor(color)) return fullMatch;
        // Replace dark color with light one
        const newStyle = existingStyle.replace(
          /color:\s*[^;]+/i,
          "color: rgba(255,255,255,0.7)"
        );
        return `<a ${attrs.replace(/style="[^"]*"/i, `style="${newStyle}"`)}>`;
      }

      // No color set — add it
      if (styleMatch) {
        const newStyle = `${existingStyle}; color: rgba(255,255,255,0.7); text-decoration: underline`;
        return `<a ${attrs.replace(/style="[^"]*"/i, `style="${newStyle}"`)}>`;
      }
      return `<a style="color: rgba(255,255,255,0.7); text-decoration: underline;" ${attrs}>`;
    }
  );

  return html.replace(
    sectionTag + sectionContent + sectionEnd,
    sectionTag + fixedContent + sectionEnd
  );
}

/** Check if a CSS color value is dark (needs light text). */
function isDarkColor(color: string): boolean {
  const hex = colorToHexValue(color);
  if (!hex) return color.includes("dark") || /^#[0-3]/.test(color);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance threshold — anything below 0.3 is "dark"
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.35;
}

/** Check if a CSS color value is light enough for dark backgrounds. */
function isLightColor(color: string): boolean {
  // rgba with high alpha on white channels
  if (/rgba\(\s*255\s*,\s*255\s*,\s*255/.test(color)) return true;
  if (color === "white" || color === "#fff" || color === "#ffffff") return true;
  const hex = colorToHexValue(color);
  if (!hex) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

/** Convert common CSS color formats to #rrggbb. */
function colorToHexValue(color: string): string | null {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return `#${parseInt(rgb[1]).toString(16).padStart(2, "0")}${parseInt(rgb[2]).toString(16).padStart(2, "0")}${parseInt(rgb[3]).toString(16).padStart(2, "0")}`;
  }
  const named: Record<string, string> = {
    black: "#000000", white: "#ffffff", navy: "#000080",
    darkblue: "#00008b", darkslategray: "#2f4f4f",
  };
  return named[color] || null;
}
