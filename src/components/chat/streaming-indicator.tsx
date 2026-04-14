"use client";

import type { StreamPhase } from "@/hooks/use-chat";
import { Loader2, PenLine, ShieldCheck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const PHASE_CONFIG: Record<
  Exclude<StreamPhase, null>,
  { label: string; icon: typeof Loader2 }
> = {
  thinking: { label: "Thinking...", icon: Loader2 },
  writing: { label: "Writing email...", icon: PenLine },
  checking: { label: "Checking quality...", icon: ShieldCheck },
  fixing: { label: "Fixing issues...", icon: Wrench },
};

interface StreamingIndicatorProps {
  phase?: StreamPhase;
}

export function StreamingIndicator({ phase }: StreamingIndicatorProps) {
  const config = phase ? PHASE_CONFIG[phase] : null;

  if (config) {
    const Icon = config.icon;
    const isSpinner = phase === "thinking" || phase === "checking";
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Icon className={cn("w-3.5 h-3.5 text-primary/70", isSpinner ? "animate-spin" : "animate-pulse")} />
        <span className="text-xs text-muted-foreground font-medium">
          {config.label}
        </span>
      </div>
    );
  }

  // Fallback: simple bouncing dots
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.15s]" />
      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.3s]" />
    </div>
  );
}
