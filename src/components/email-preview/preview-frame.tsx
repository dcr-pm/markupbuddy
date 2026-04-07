"use client";

import { useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { injectBlockLabels, type BlockMap } from "@/lib/mjml/block-labels";

interface PreviewFrameProps {
  html: string;
  width: number;
  darkMode: boolean;
  blockMap?: BlockMap;
  showBlockLabels?: boolean;
}

export function PreviewFrame({ html, width, darkMode, blockMap, showBlockLabels }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The iframe sandbox="allow-same-origin" (no allow-scripts) is the security
  // boundary — it blocks all JS execution. No need for DOMPurify which was
  // breaking email HTML by stripping valid email attributes and tags.
  const wrappedHtml = useMemo(() => {
    // Inject block labels if enabled
    let processed = html;
    if (showBlockLabels && blockMap && Object.keys(blockMap).length > 0) {
      processed = injectBlockLabels(processed, blockMap);
    }

    if (darkMode) {
      if (processed.includes("<body")) {
        return processed.replace(
          /<body([^>]*)>/i,
          '<body$1 style="background-color: #1a1a1a !important;">'
        );
      }
      return `<html><body style="background-color: #1a1a1a; margin: 0; padding: 0;">${processed}</body></html>`;
    }
    return processed;
  }, [html, darkMode, blockMap, showBlockLabels]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resizeIframe = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const height = doc.documentElement?.scrollHeight || doc.body?.scrollHeight;
        if (height && height > 50) {
          iframe.style.height = `${height}px`;
        }
      } catch {
        // ignore cross-origin errors
      }
    };

    try {
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(wrappedHtml);
        doc.close();

        // Resize after initial render, after images load, and after fonts load
        resizeIframe();
        setTimeout(resizeIframe, 100);
        setTimeout(resizeIframe, 500);
        setTimeout(resizeIframe, 1500);

        // Also resize when images finish loading
        const images = doc.querySelectorAll("img");
        images.forEach((img) => {
          if (!img.complete) {
            img.addEventListener("load", resizeIframe);
          }
        });
      }
    } catch {
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
        style={{ height: "auto", minHeight: "200px" }}
      />
    </div>
  );
}
