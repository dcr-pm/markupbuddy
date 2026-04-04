"use client";

import DOMPurify from "dompurify";

export function sanitizeHtmlForPreview(html: string): string {
  if (typeof window === "undefined") return html;

  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ["style", "link", "meta", "head", "body", "html", "!--"],
    ADD_ATTR: [
      "style",
      "class",
      "id",
      "width",
      "height",
      "align",
      "valign",
      "bgcolor",
      "background",
      "border",
      "cellpadding",
      "cellspacing",
      "role",
      "aria-hidden",
      "target",
      "rel",
    ],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
    ],
  });
}
