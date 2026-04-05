"use client";

import { cn, formatDate } from "@/lib/utils";
import type { Message } from "@/types/chat";
import { User, Bot } from "lucide-react";
import { ImageOptions } from "./image-options";
import { ClarificationCard, parseClarification } from "./clarification-card";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onImageSelected?: (prompt: string, url: string) => void;
  onSendReply?: (text: string) => void;
}

export function MessageBubble({ message, isStreaming, onImageSelected, onSendReply }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { text, imagePrompts } = parseContent(message.content, isUser);
  const clarification = !isUser && !isStreaming ? parseClarification(message.content) : null;

  return (
    <div
      className={cn("flex gap-3 px-4 py-4", isUser ? "justify-end" : "")}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-2 max-w-[85%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md"
          )}
        >
          {message.metadata?.imageUrl && (
            <div className="mb-2">
              <img
                src={message.metadata.imageUrl}
                alt="Uploaded"
                className="max-w-[300px] rounded-lg"
              />
            </div>
          )}
          {clarification ? (
            <ClarificationCard
              intro={clarification.intro}
              questions={clarification.questions}
              outro={clarification.outro}
              onSubmit={(answers) => onSendReply?.(answers)}
            />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {text}
            </div>
          )}
          {isStreaming && !message.content && (
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.1s]" />
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
            </span>
          )}
        </div>

        {imagePrompts.length > 0 && !isStreaming && (
          <div className="w-full">
            {imagePrompts.map((prompt, i) => (
              <ImageOptions
                key={`${message.id}-img-${i}`}
                prompt={prompt}
                onSelect={(url) => onImageSelected?.(prompt, url)}
              />
            ))}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {formatDate(message.created_at)}
        </span>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

function parseContent(content: string, isUser: boolean): { text: string; imagePrompts: string[] } {
  if (isUser) return { text: content, imagePrompts: [] };

  const imagePrompts: string[] = [];
  const imageTagRegex = /\[GENERATE_IMAGE:\s*([^\]]+)\]/g;
  let match;
  while ((match = imageTagRegex.exec(content)) !== null) {
    imagePrompts.push(match[1].trim());
  }

  // Strip HTML blocks and image tags from displayed text
  const text = content
    .replace(/```html[\s\S]*?```/g, "")
    .replace(/```html[\s\S]*/g, "")
    .replace(imageTagRegex, "")
    .trim();

  return { text, imagePrompts };
}
