"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat";
import type { StreamPhase } from "@/hooks/use-chat";
import { MessageBubble } from "./message-bubble";
import { Mail, Megaphone, Tag, Newspaper, Blocks } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamPhase?: StreamPhase;
  onImageSelected?: (prompt: string, url: string) => void;
  onSuggestionClick?: (text: string) => void;
  onRetry?: () => void;
}

export function MessageList({ messages, isStreaming, streamPhase, onImageSelected, onSuggestionClick, onRetry }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <div className="w-14 h-14 mx-auto mb-6 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            What email can I build for you?
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            Describe it, paste a screenshot, upload an image, or pick a starting point below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                onClick={() => onSuggestionClick?.(s.text)}
                className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:gradient-bg group-hover:text-white transition-all">
                  <s.icon className="w-4 h-4" />
                </div>
                <span className="pt-1">{s.text}</span>
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
            streamPhase={
              isStreaming &&
              i === messages.length - 1 &&
              msg.role === "assistant"
                ? streamPhase
                : undefined
            }
            onImageSelected={onImageSelected}
            onSendReply={onSuggestionClick}
            onRetry={
              !isStreaming &&
              i === messages.length - 1 &&
              msg.role === "assistant" &&
              !msg.content?.trim()
                ? onRetry
                : undefined
            }
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  { text: "Build me a single HTML block — hero banner with headline and CTA", icon: Blocks },
  { text: "I need a welcome email for new subscribers", icon: Mail },
  { text: "Help me design a product launch announcement", icon: Megaphone },
  { text: "I want to build a promotional sale email", icon: Tag },
  { text: "Create a newsletter with multiple article sections", icon: Newspaper },
];
