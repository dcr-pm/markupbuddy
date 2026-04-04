"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onImageSelected?: (prompt: string, url: string) => void;
  onSuggestionClick?: (text: string) => void;
}

export function MessageList({ messages, isStreaming, onImageSelected, onSuggestionClick }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            What email can I build for you?
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Describe it, paste a screenshot, upload an image, or ask for a
            template.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestionClick?.(s)}
                className="p-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-accent transition text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={
              isStreaming &&
              i === messages.length - 1 &&
              msg.role === "assistant"
            }
            onImageSelected={onImageSelected}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Give me a welcome email template",
  "Build a 20% off sale email with a hero image",
  "Create an abandoned cart email with product recommendations",
  "Design a newsletter template with 3 article sections",
];
