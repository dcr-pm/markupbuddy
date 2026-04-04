"use client";

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.15s]" />
      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.3s]" />
    </div>
  );
}
