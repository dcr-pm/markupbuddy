"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Hammer, Pencil, GripVertical, Trash2 } from "lucide-react";

interface BlockPlanBlock {
  number: number;
  name: string;
  description: string;
}

interface BlockPlanCardProps {
  intro: string;
  blocks: BlockPlanBlock[];
  assetPrompt: string;
  onBuild: (message: string) => void;
}

export function BlockPlanCard({
  intro,
  blocks: initialBlocks,
  assetPrompt,
  onBuild,
}: BlockPlanCardProps) {
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [mode, setMode] = useState<"ready" | "editing">("ready");
  const [blocks, setBlocks] = useState<BlockPlanBlock[]>(initialBlocks);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const modified = blocks !== initialBlocks;

  const handleDelete = useCallback((index: number) => {
    setBlocks((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Renumber
      return next.map((b, i) => ({ ...b, number: i + 1 }));
    });
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next.map((b, i) => ({ ...b, number: i + 1 }));
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleBuild = () => {
    if (submitted) return;
    if (modified) {
      // Send the modified block list so the AI knows what to build
      const blockList = blocks
        .map((b) => `Block ${b.number}: ${b.name} — ${b.description}`)
        .join("\n");
      onBuild(`Build it with this updated plan:\n${blockList}`);
    } else {
      onBuild("build it");
    }
    setSubmitted(true);
  };

  const handleSendFeedback = () => {
    if (submitted || !feedback.trim()) return;
    onBuild(feedback.trim());
    setSubmitted(true);
  };

  return (
    <div className="space-y-3 mt-2">
      {intro && (
        <p className="text-sm text-foreground">{intro}</p>
      )}

      <div className="space-y-1">
        {blocks.map((block, index) => (
          <div
            key={`block-${block.number}-${block.name}`}
            draggable={!submitted}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-1.5 text-xs rounded-lg px-1.5 py-1 transition-all group",
              !submitted && "hover:bg-accent/50",
              dragIndex === index && "opacity-40",
              dragOverIndex === index && dragIndex !== index && "border-t-2 border-primary"
            )}
          >
            {!submitted && (
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 cursor-grab active:cursor-grabbing flex-shrink-0" />
            )}
            <span className="flex-shrink-0 w-5 h-5 rounded bg-primary/10 text-primary font-semibold flex items-center justify-center text-[10px]">
              {block.number}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-foreground">
                {block.name}
              </span>
              {block.description && (
                <span className="text-muted-foreground">
                  {" "}— {block.description}
                </span>
              )}
            </div>
            {!submitted && blocks.length > 1 && (
              <button
                onClick={() => handleDelete(index)}
                className="flex-shrink-0 p-1 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all"
                title="Remove block"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {assetPrompt && !submitted && (
        <p className="text-xs text-muted-foreground">{assetPrompt}</p>
      )}

      {!submitted && (
        <div className="space-y-2 pt-1">
          {mode === "editing" && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Describe what you'd like to change..."
                className="flex-1 px-3 py-1.5 rounded-lg text-xs border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && feedback.trim()) {
                    handleSendFeedback();
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleSendFeedback}
                disabled={!feedback.trim()}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  feedback.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Send
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBuild}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <Hammer className="w-3 h-3" />
              Build it
            </button>
            {mode === "ready" && (
              <button
                onClick={() => setMode("editing")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <Pencil className="w-3 h-3" />
                Request changes
              </button>
            )}
          </div>
        </div>
      )}

      {submitted && (
        <p className="text-xs text-muted-foreground italic">
          {feedback ? "Changes requested" : "Building your email..."}
        </p>
      )}
    </div>
  );
}

/**
 * Detect if an assistant message contains a block plan and parse it.
 * Looks for numbered lines like:
 *   Block 1: **Header** — Logo + nav
 *   Block 2: **Hero** — Full-width banner
 */
export function parseBlockPlan(content: string): {
  intro: string;
  blocks: BlockPlanBlock[];
  assetPrompt: string;
} | null {
  // If the message contains ANY code fences or raw MJML tags, it's a BUILD response, not a plan
  if (/```/.test(content)) return null;
  if (/<mjml[\s>]/i.test(content)) return null;
  if (/<mj-body[\s>]/i.test(content)) return null;

  const blocks: BlockPlanBlock[] = [];

  // Pattern: "Block N: **Name** — description" or "Block N: Name — description"
  const patterns = [
    /Block\s+(\d+):\s+\*\*([^*]+)\*\*\s*[—–\-]\s*(.+)/gi,
    /Block\s+(\d+):\s+([^—–\-\n]+?)\s*[—–\-]\s*(.+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      blocks.push({
        number: parseInt(match[1]),
        name: match[2].trim(),
        description: match[3].trim(),
      });
    }
    if (blocks.length >= 2) break;
  }

  if (blocks.length < 2) return null;

  // Strip all code, markup, and technical content from text
  const stripCode = (text: string) =>
    text
      .replace(/```[\s\S]*?```/g, "")               // fenced code blocks
      .replace(/```[\s\S]*/g, "")                    // unclosed code blocks
      .replace(/<!--[\s\S]*?-->/g, "")               // HTML comments
      .replace(/<\/?[a-z][\w-]*(?:\s[^>]*)?\/?>/gi, "")  // ALL HTML/MJML tags
      .replace(/\{[^{}]*:[^{}]*\}/g, "")             // CSS rule blocks
      .replace(/style="[^"]*"/gi, "")                // inline styles
      .replace(/https?:\/\/\S+/gi, "")               // URLs
      .replace(/\*\*/g, "")
      .replace(/[#>]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  // Extract intro text (before "Block 1")
  const firstBlockIndex = content.search(/Block\s+1\s*:/i);
  let intro = "";
  if (firstBlockIndex > 0) {
    intro = stripCode(
      content
        .slice(0, firstBlockIndex)
        .replace(/\*\*Here'?s the build plan:?\*\*/gi, "")
    );
  }

  // Extract asset prompt (text after last block, before "build it" / "ready" mention)
  const lastBlockMatch = content.match(/Block\s+\d+:\s+.+/gi);
  let assetPrompt = "";
  if (lastBlockMatch) {
    const lastBlockEnd = content.lastIndexOf(lastBlockMatch[lastBlockMatch.length - 1]);
    const afterBlocks = content.slice(lastBlockEnd + lastBlockMatch[lastBlockMatch.length - 1].length);
    assetPrompt = stripCode(afterBlocks)
      .replace(/say\s+[""]?build it[""]?.*/i, "")
      .replace(/[""]build it[""]?.*/i, "")
      .replace(/when you'?re ready.*/i, "")
      .trim();
  }

  return { intro, blocks, assetPrompt };
}
