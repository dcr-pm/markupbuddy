"use client";

import { useState, useEffect } from "react";
import { PreviewFrame } from "./preview-frame";
import { PreviewToolbar } from "./preview-toolbar";
import { usePreview } from "@/hooks/use-preview";
import { Mail, Lightbulb } from "lucide-react";

const EMAIL_TIPS = [
  {
    title: "Keep it scannable",
    tip: "Most people spend 11 seconds reading an email. Use clear headings, short paragraphs, and a single focused CTA.",
  },
  {
    title: "Preheader text matters",
    tip: "The preheader is the first thing people see after the subject line. Use it to complement — not repeat — your subject.",
  },
  {
    title: "Bulletproof buttons",
    tip: "Use table-based buttons with VML fallbacks so CTAs render in every client, including Outlook.",
  },
  {
    title: "Alt text is essential",
    tip: "40% of users block images by default. Good alt text ensures your message still gets across.",
  },
  {
    title: "Test dark mode",
    tip: "Apple Mail, Gmail, and Outlook all have dark mode. Use transparent PNGs and test your colors in both modes.",
  },
  {
    title: "Mobile-first design",
    tip: "Over 60% of emails are opened on mobile. Design for 375px first, then enhance for desktop.",
  },
  {
    title: "Personalization lifts CTR",
    tip: "Emails with personalized subject lines are 26% more likely to be opened. Always include fallbacks.",
  },
  {
    title: "Optimal send width",
    tip: "600px is the sweet spot for email width. It renders well across all major clients and devices.",
  },
  {
    title: "Inline your CSS",
    tip: "Many email clients strip <style> tags. Always inline critical styles for consistent rendering.",
  },
  {
    title: "One CTA per email",
    tip: "Emails with a single call-to-action increase clicks by 371% compared to those with multiple competing CTAs.",
  },
];

interface PreviewPanelProps {
  html: string | null;
  isStreaming?: boolean;
  onSendTest?: () => void;
}

export function PreviewPanel({ html, isStreaming, onSendTest }: PreviewPanelProps) {
  const preview = usePreview();
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;
    setTipIndex(Math.floor(Math.random() * EMAIL_TIPS.length));
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % EMAIL_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Streaming state with tips
  if (isStreaming && !html) {
    const tip = EMAIL_TIPS[tipIndex];
    return (
      <div className="flex-1 flex items-center justify-center bg-surface p-8">
        <div className="text-center max-w-sm">
          {/* Animated email icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20 animate-float">
            <Mail className="w-8 h-8 text-white" />
          </div>

          <p className="text-sm font-semibold text-foreground mb-1">
            Building your email...
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            This usually takes a few seconds
          </p>

          {/* Progress shimmer bar */}
          <div className="w-48 h-1 mx-auto rounded-full bg-border overflow-hidden mb-6">
            <div className="h-full w-1/2 gradient-bg rounded-full animate-shimmer" />
          </div>

          {/* Tip card */}
          <div className="bg-background rounded-xl p-4 border border-border shadow-sm transition-all duration-500">
            <div className="flex items-start gap-2.5 text-left">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">{tip.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.tip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!html) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-center">
          {/* Email envelope shape */}
          <div className="relative w-24 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-xl border-2 border-dashed border-border" />
            <div className="absolute inset-x-0 top-0 h-8 overflow-hidden">
              <div className="w-full h-16 border-2 border-dashed border-border rotate-[3deg] origin-top-left" style={{ clipPath: "polygon(50% 60%, 0 0, 100% 0)" }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pt-2">
              <Mail className="w-6 h-6 text-muted-foreground/30" />
            </div>
          </div>
          <p className="text-sm font-medium text-foreground">Email Preview</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your email will appear here as it&apos;s built
          </p>
        </div>
      </div>
    );
  }

  // Rendered email
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface">
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
