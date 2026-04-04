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

  // Rotate tips while streaming
  useEffect(() => {
    if (!isStreaming) return;
    setTipIndex(Math.floor(Math.random() * EMAIL_TIPS.length));
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % EMAIL_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Show waiting room while streaming
  if (isStreaming) {
    const tip = EMAIL_TIPS[tipIndex];
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-sm font-medium text-foreground mb-2">
            Building your email...
          </p>
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.15s]" />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.3s]" />
          </div>
          <div className="bg-muted/50 rounded-xl p-4 border border-border transition-all duration-500">
            <div className="flex items-start gap-2.5 text-left">
              <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground mb-1">{tip.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.tip}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state when no HTML
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

  // Show rendered email
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
