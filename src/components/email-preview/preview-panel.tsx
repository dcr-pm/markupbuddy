"use client";

import { PreviewFrame } from "./preview-frame";
import { PreviewToolbar } from "./preview-toolbar";
import { usePreview } from "@/hooks/use-preview";
import { Mail } from "lucide-react";

interface PreviewPanelProps {
  html: string | null;
  onSendTest?: () => void;
}

export function PreviewPanel({ html, onSendTest }: PreviewPanelProps) {
  const preview = usePreview();

  if (!html) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Email preview</p>
          <p className="text-xs mt-1">Your email will appear here as it&apos;s built</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
      <PreviewToolbar
        html={html}
        deviceMode={preview.deviceMode}
        darkMode={preview.darkMode}
        onToggleDevice={preview.toggleDevice}
        onToggleDarkMode={preview.toggleDarkMode}
        onSendTest={onSendTest}
      />
      <div className="flex-1 overflow-y-auto p-4">
        <PreviewFrame
          html={html}
          width={preview.deviceWidth}
          darkMode={preview.darkMode}
        />
      </div>
    </div>
  );
}
