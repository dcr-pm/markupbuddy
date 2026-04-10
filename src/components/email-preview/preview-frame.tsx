"use client";

import { useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { injectBlockLabels, type BlockMap } from "@/lib/mjml/block-labels";
import { injectDragHandles, setupDragListeners } from "@/lib/mjml/element-drag";

export type BlockAction = {
  type: "delete" | "move-up" | "move-down";
  blockNumber: number;
};

interface PreviewFrameProps {
  html: string;
  width: number;
  darkMode: boolean;
  blockMap?: BlockMap;
  showBlockLabels?: boolean;
  onBlockAction?: (action: BlockAction) => void;
  onBlockRename?: (blockNumber: number, newName: string) => void;
  onElementReorder?: (html: string) => void;
}

export function PreviewFrame({ html, width, darkMode, blockMap, showBlockLabels, onBlockAction, onBlockRename, onElementReorder }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Track when a change originated from inside the iframe (inline edit)
  // so we can skip the full rewrite that destroys scroll position & focus
  const internalEditRef = useRef(false);

  // Wrap onElementReorder so it sets the internal-edit flag first
  const handleElementReorder = useMemo(() => {
    if (!onElementReorder) return undefined;
    return (reorderedHtml: string) => {
      internalEditRef.current = true;
      onElementReorder(reorderedHtml);
    };
  }, [onElementReorder]);

  // The iframe sandbox="allow-same-origin" (no allow-scripts) is the security
  // boundary — it blocks all JS execution. No need for DOMPurify which was
  // breaking email HTML by stripping valid email attributes and tags.
  const wrappedHtml = useMemo(() => {
    // Inject block labels if enabled
    let processed = html;
    if (showBlockLabels) {
      processed = injectBlockLabels(processed, blockMap || {}, !!onBlockAction);
      if (handleElementReorder) {
        processed = injectDragHandles(processed);
      }
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
  }, [html, darkMode, blockMap, showBlockLabels, onBlockAction, handleElementReorder]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // If this render was triggered by an in-iframe edit, skip the full rewrite
    if (internalEditRef.current) {
      internalEditRef.current = false;
      return;
    }

    let cleanupDrag: (() => void) | null = null;

    const resizeIframe = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        // Reset to 0 first so scrollHeight reflects actual content, not old frame size
        iframe.style.height = "0px";
        const height = doc.documentElement?.scrollHeight || doc.body?.scrollHeight;
        if (height && height > 50) {
          iframe.style.height = `${height}px`;
        } else {
          iframe.style.height = "auto";
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

        // Attach click listeners for block action buttons
        if (showBlockLabels && onBlockAction) {
          const buttons = doc.querySelectorAll("[data-block-action]");
          buttons.forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              const el = e.currentTarget as HTMLElement;
              const actionType = el.getAttribute("data-block-action") as BlockAction["type"];
              const blockNum = parseInt(el.getAttribute("data-block-num") || "0");
              if (actionType && blockNum) {
                onBlockAction({ type: actionType, blockNumber: blockNum });
              }
            });
          });
        }

        // Attach blur listeners for editable block names
        if (showBlockLabels && onBlockRename) {
          const nameSpans = doc.querySelectorAll("[data-block-name]");
          nameSpans.forEach((span) => {
            span.addEventListener("blur", () => {
              const el = span as HTMLElement;
              const blockNum = parseInt(el.getAttribute("data-block-num") || "0");
              const newName = el.textContent?.trim() || "";
              if (blockNum >= 0 && newName) {
                onBlockRename(blockNum, newName);
              }
            });
            span.addEventListener("keydown", (e) => {
              if ((e as KeyboardEvent).key === "Enter") {
                e.preventDefault();
                (span as HTMLElement).blur();
              }
            });
          });
        }

        // Set up CTA drag listeners (handles are already in the HTML string)
        if (showBlockLabels && handleElementReorder) {
          const hasHandles = doc.querySelector("[data-drag-handle]");
          if (hasHandles) {
            cleanupDrag = setupDragListeners(doc, handleElementReorder);
          }
        }
      }
    } catch {
      iframe.srcdoc = wrappedHtml;
    }

    return () => {
      if (cleanupDrag) cleanupDrag();
    };
  }, [wrappedHtml, showBlockLabels, onBlockAction, onBlockRename, handleElementReorder]);

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
