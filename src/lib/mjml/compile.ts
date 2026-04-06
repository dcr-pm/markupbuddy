interface CompileResult {
  html: string;
  errors: string[];
}

/**
 * Compile MJML markup to production-ready email HTML.
 * Uses dynamic import to avoid build-time file descriptor issues.
 */
export async function compileMjml(mjmlSource: string): Promise<CompileResult> {
  try {
    // Dynamic import to avoid build-time initialization
    const mjml2html = (await import("mjml")).default;

    const result = mjml2html(mjmlSource, {
      validationLevel: "soft",
      minify: false,
    });

    return {
      html: result.html,
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
