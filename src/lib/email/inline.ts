import juice from "juice";

export function inlineStyles(html: string): string {
  return juice(html, {
    preserveMediaQueries: true,
    preserveFontFaces: true,
    preserveKeyFrames: true,
    removeStyleTags: false,
    insertPreservedExtraCss: true,
  });
}
