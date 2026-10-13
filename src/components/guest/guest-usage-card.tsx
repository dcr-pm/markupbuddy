"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, USAGE_CHANGED_EVENT, type GenerationUsage } from "@/lib/guest";

export function GuestUsageCard({ initialUsage }: { initialUsage: GenerationUsage }) {
  const [usage, setUsage] = useState(initialUsage);

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) return;
        const data = await res.json();
        if (data.usage) setUsage(data.usage);
      } catch {
        // Keep showing the last known count
      }
    };
    window.addEventListener(USAGE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(USAGE_CHANGED_EVENT, refresh);
  }, []);

  const used = Math.min(usage.used, usage.limit);
  const exhausted = usage.remaining === 0;

  return (
    <div
      className={cn(
        "mx-2 mb-2 rounded-xl border p-3",
        exhausted ? "border-destructive/30 bg-destructive/5" : "border-primary/15 bg-background"
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className={cn("w-3.5 h-3.5", exhausted ? "text-destructive" : "text-primary")} />
        <span className="text-xs font-semibold text-foreground">Free trial</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {used} / {usage.limit} generations
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className={cn("h-full rounded-full transition-all", exhausted ? "bg-destructive" : "gradient-bg")}
          style={{ width: `${(used / usage.limit) * 100}%` }}
        />
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {exhausted
          ? "You've used all your free generations. "
          : `${usage.remaining} generation${usage.remaining === 1 ? "" : "s"} left. `}
        Contact{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
          {CONTACT_EMAIL}
        </a>{" "}
        if you want to access this feature more.
      </p>
    </div>
  );
}
