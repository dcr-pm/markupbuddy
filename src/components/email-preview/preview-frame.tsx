"use client";

import { useMemo, useRef, useEffect } from "react";
import { sanitizeHtmlForPreview } from "@/lib/email/sanitize";
import { cn } from "@/lib/utils";

interface PreviewFrameProps {
  html: string;
  width: number;
  darkMode: boolean;
}

export function PreviewFrame({ html, width, darkMode }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sanitizedHtml = useMemo(() => sanitizeHtmlForPreview(html), [html]);

  const wrappedHtml = useMemo(() => {
    const base = sanitizedHtml || html;
    if (darkMode) {
      return `<div style="background-color: #1a1a1a; min-height: 100%; padding: 0;">${base}</div>`;
    }
    return base;
  }, [sanitizedHtml, html, darkMode]);

  // Write to iframe document directly for better compatibility
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(wrappedHtml);
        doc.close();

        // Auto-resize after content loads
        setTimeout(() => {
          try {
            const height = doc.documentElement?.scrollHeight;
            if (height && height > 50) {
              iframe.style.height = `${height + 20}px`;
            }
          } catch {
            // ignore
          }
        }, 200);
      }
    } catch {
      // Fallback: use srcdoc
      iframe.srcdoc = wrappedHtml;
    }
  }, [wrappedHtml]);

  return (
    <div
      className={cn(
        "overflow-hidden bg-white transition-all duration-300 mx-auto rounded-lg border border-border",
        darkMode && "bg-gray-900"
      )}
      style={{ width: `${width}px`, maxWidth: "100%" }}
    >
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        title="Email Preview"
        className="w-full border-0"
        style={{ height: "500px", minHeight: "200px" }}
      />
    </div>
  );
}
