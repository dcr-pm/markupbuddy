"use client";

import { useMemo } from "react";
import { sanitizeHtmlForPreview } from "@/lib/email/sanitize";
import { cn } from "@/lib/utils";

interface PreviewFrameProps {
  html: string;
  width: number;
  darkMode: boolean;
}

export function PreviewFrame({ html, width, darkMode }: PreviewFrameProps) {
  const sanitizedHtml = useMemo(() => sanitizeHtmlForPreview(html), [html]);

  const wrappedHtml = useMemo(() => {
    if (darkMode) {
      return `<div style="background-color: #1a1a1a; min-height: 100%; padding: 0;">${sanitizedHtml}</div>`;
    }
    return sanitizedHtml;
  }, [sanitizedHtml, darkMode]);

  return (
    <div
      className={cn(
        "overflow-hidden bg-white transition-all duration-300 mx-auto",
        darkMode && "bg-gray-900"
      )}
      style={{ width: `${width}px`, maxWidth: "100%" }}
    >
      <iframe
        srcDoc={wrappedHtml}
        sandbox="allow-same-origin"
        title="Email Preview"
        className="w-full border-0"
        style={{ height: "500px" }}
        onLoad={(e) => {
          // Auto-resize iframe to content height
          const iframe = e.target as HTMLIFrameElement;
          try {
            const height = iframe.contentDocument?.documentElement?.scrollHeight;
            if (height) {
              iframe.style.height = `${height + 20}px`;
            }
          } catch {
            // Cross-origin issues — keep default height
          }
        }}
      />
    </div>
  );
}
