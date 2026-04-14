"use client";

import {
  Copy,
  Download,
  Send,
  Monitor,
  Smartphone,
  Moon,
  Sun,
  Check,
  Layers,
} from "lucide-react";
import { useState, useCallback } from "react";
import { inlineStyles } from "@/lib/email/inline";
import { cn } from "@/lib/utils";
import type { DeviceMode } from "@/hooks/use-preview";

interface PreviewToolbarProps {
  html: string;
  mjml?: string | null;
  deviceMode: DeviceMode;
  darkMode: boolean;
  showBlockLabels: boolean;
  onToggleDevice: () => void;
  onToggleDarkMode: () => void;
  onToggleBlockLabels: () => void;
  onSendTest?: () => void;
}

export function PreviewToolbar({
  html,
  mjml,
  deviceMode,
  darkMode,
  showBlockLabels,
  onToggleDevice,
  onToggleDarkMode,
  onToggleBlockLabels,
  onSendTest,
}: PreviewToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const inlined = inlineStyles(html);
      await navigator.clipboard.writeText(inlined);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = html;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [html]);

  const handleDownloadHtml = useCallback(() => {
    const inlined = inlineStyles(html);
    const blob = new Blob([inlined], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  }, [html]);

  const handleDownloadMjml = useCallback(() => {
    if (!mjml) return;
    const blob = new Blob([mjml], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email.mjml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  }, [mjml]);

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleDevice}
          className={cn(
            "p-1.5 rounded-md transition text-sm",
            deviceMode === "desktop"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Desktop (600px)"
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleDevice}
          className={cn(
            "p-1.5 rounded-md transition text-sm",
            deviceMode === "mobile"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Mobile (375px)"
        >
          <Smartphone className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={onToggleDarkMode}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition"
          title={darkMode ? "Light background" : "Dark background"}
        >
          {darkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={onToggleBlockLabels}
          className={cn(
            "p-1.5 rounded-md transition",
            showBlockLabels
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={showBlockLabels ? "Hide block labels" : "Show block labels"}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background transition"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied!" : "Copy HTML"}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          {showDownloadMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={handleDownloadHtml}
                  className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition"
                >
                  Download HTML
                </button>
                {mjml && (
                  <button
                    onClick={handleDownloadMjml}
                    className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition"
                  >
                    Download MJML
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {onSendTest && (
          <button
            onClick={onSendTest}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition"
          >
            <Send className="w-3.5 h-3.5" />
            Send Test
          </button>
        )}
      </div>
    </div>
  );
}
