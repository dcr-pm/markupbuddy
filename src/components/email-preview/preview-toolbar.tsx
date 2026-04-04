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
} from "lucide-react";
import { useState, useCallback } from "react";
import { inlineStyles } from "@/lib/email/inline";
import { cn } from "@/lib/utils";
import type { DeviceMode } from "@/hooks/use-preview";

interface PreviewToolbarProps {
  html: string;
  deviceMode: DeviceMode;
  darkMode: boolean;
  onToggleDevice: () => void;
  onToggleDarkMode: () => void;
  onSendTest?: () => void;
}

export function PreviewToolbar({
  html,
  deviceMode,
  darkMode,
  onToggleDevice,
  onToggleDarkMode,
  onSendTest,
}: PreviewToolbarProps) {
  const [copied, setCopied] = useState(false);

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

  const handleDownload = useCallback(() => {
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
  }, [html]);

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
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background transition"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
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
