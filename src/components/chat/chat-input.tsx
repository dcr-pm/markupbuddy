"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({
  onSend,
  onImageUpload,
  isStreaming,
  onStop,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleTextareaInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImageUpload) return;

      const validTypes = [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a PNG, JPG, GIF, or WebP image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("Image must be under 10MB.");
        return;
      }

      setUploading(true);
      const url = await onImageUpload(file);
      setUploading(false);

      if (url) {
        onSend(
          text.trim() ||
            "Replicate this email design as production-ready HTML.",
          url
        );
        setText("");
      }

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onImageUpload, onSend, text]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pastedText = e.clipboardData.getData("text");

      // Detect HTML paste
      if (
        pastedText.includes("<!DOCTYPE") ||
        pastedText.includes("<html") ||
        pastedText.includes("<table") ||
        (pastedText.includes("<td") && pastedText.includes("<tr"))
      ) {
        e.preventDefault();
        const confirmMsg =
          "Detected HTML content. Want me to analyze and improve this email?";
        if (window.confirm(confirmMsg)) {
          onSend(
            `Here's an email HTML I'd like you to analyze and improve:\n\n${pastedText}`
          );
          return;
        }
      }

      // Detect URL paste
      try {
        const url = new URL(pastedText.trim());
        if (url.protocol === "http:" || url.protocol === "https:") {
          e.preventDefault();
          const confirmMsg = `Detected URL: ${url.hostname}. Want me to scrape this and rebuild it as a clean email?`;
          if (window.confirm(confirmMsg)) {
            onSend(`Scrape and rebuild this email: ${pastedText.trim()}`);
            return;
          }
        }
      } catch {
        // Not a URL, let it paste normally
      }
    },
    [onSend]
  );

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming || uploading}
          className="flex-shrink-0 p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50"
          title="Upload image"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTextareaInput();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Describe your email or paste a screenshot..."
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border border-border bg-muted px-4 py-3 pr-12 text-sm",
              "placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20",
              "outline-none transition max-h-[200px] scrollbar-thin"
            )}
          />
        </div>

        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 p-2.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition"
            title="Stop generating"
          >
            <Square className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="flex-shrink-0 p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
