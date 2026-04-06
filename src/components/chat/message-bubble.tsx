"use client";

import { cn, formatDate } from "@/lib/utils";
import type { Message } from "@/types/chat";
import { User, Bot, Sparkles, PenTool, LayoutTemplate } from "lucide-react";
import { ImageOptions } from "./image-options";
import { ClarificationCard, parseClarification } from "./clarification-card";
import { BlockPlanCard, parseBlockPlan } from "./block-plan-card";

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
  const blockPlan = !isUser && !isStreaming && !clarification ? parseBlockPlan(message.content) : null;

  // Detect if streaming content is building toward a clarification or block plan
  const streamingPhase = isStreaming && !isUser ? detectStreamingPhase(message.content) : null;

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
          ) : blockPlan ? (
            <BlockPlanCard
              intro={blockPlan.intro}
              blocks={blockPlan.blocks}
              assetPrompt={blockPlan.assetPrompt}
              onBuild={(msg) => onSendReply?.(msg)}
            />
          ) : streamingPhase ? (
            <StreamingPlaceholder phase={streamingPhase} />
          ) : (
            <div className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
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

/**
 * Render basic markdown: bold, italic, inline code, and sanitize HTML.
 */
function renderMarkdown(text: string): string {
  return text
    // Escape HTML to prevent injection
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>")
    // Inline code: `text`
    .replace(/`([^`]+)`/g, '<code class="bg-background/50 px-1 py-0.5 rounded text-xs">$1</code>');
}

type StreamingPhaseType = "clarification" | "blockplan" | "building";

/**
 * Detect what the AI is building during streaming so we can show
 * a fun placeholder instead of raw markdown.
 */
function detectStreamingPhase(content: string): StreamingPhaseType | null {
  if (!content || content.length < 30) return null;

  // Check if it's building MJML/HTML (code fence opened)
  if (/```(?:mjml|html)/i.test(content)) return "building";

  // Check for clarification patterns: numbered bold questions with options
  const hasClarificationPattern =
    /\d+\.\s+\*\*\w/.test(content) && /\([\w\s,]+/.test(content);
  if (hasClarificationPattern) return "clarification";

  // Check for block plan pattern
  if (/Block\s+\d+:\s+/i.test(content)) return "blockplan";

  return null;
}

const PHASE_CONFIG = {
  clarification: {
    icon: PenTool,
    title: "Preparing your design questions...",
    subtitle: "Getting the right details to build your perfect email",
    color: "text-blue-400",
  },
  blockplan: {
    icon: LayoutTemplate,
    title: "Designing your layout...",
    subtitle: "Mapping out the perfect block structure",
    color: "text-purple-400",
  },
  building: {
    icon: Sparkles,
    title: "Building your email...",
    subtitle: "Crafting responsive, production-ready HTML",
    color: "text-amber-400",
  },
} as const;

function StreamingPlaceholder({ phase }: { phase: StreamingPhaseType }) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn("animate-pulse", config.color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{config.title}</p>
        <p className="text-xs text-muted-foreground">{config.subtitle}</p>
      </div>
      <span className="inline-flex gap-1 ml-auto">
        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.15s]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.3s]" />
      </span>
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

  // Strip ALL code blocks, MJML/HTML tags, and image tags from displayed text
  const text = content
    .replace(/```[\s\S]*?```/g, "")          // all fenced code blocks (closed)
    .replace(/```[\s\S]*/g, "")              // unclosed code blocks (truncated)
    .replace(/<\/?mj[\w-]*[^>]*>/gi, "")     // any stray MJML tags
    .replace(imageTagRegex, "")
    .trim();

  return { text, imagePrompts };
}
