import { Mail } from "lucide-react";
import { CONTACT_EMAIL, GUEST_GENERATION_LIMIT } from "@/lib/guest";

export function GuestLimitCard() {
  return (
    <div className="mx-4 mb-3 rounded-2xl border border-primary/20 bg-accent/40 p-4">
      <p className="text-sm font-semibold text-foreground mb-1">
        You&apos;ve reached the free trial limit
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        The free trial includes {GUEST_GENERATION_LIMIT} email generations. Contact{" "}
        <span className="font-medium text-foreground">{CONTACT_EMAIL}</span> if you want to
        access this feature more.
      </p>
      <a
        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("MarkupBuddy access")}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs font-medium hover:opacity-90 transition"
      >
        <Mail className="w-3.5 h-3.5" />
        Email Darren
      </a>
    </div>
  );
}
