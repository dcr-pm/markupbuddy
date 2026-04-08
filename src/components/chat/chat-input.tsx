"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, Square, Loader2, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if ((!trimmed && !attachedImage) || isStreaming) return;
    onSend(
      trimmed || "Here's an image — what do you think?",
      attachedImage || undefined
    );
    setText("");
    setAttachedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, attachedImage, isStreaming, onSend]);

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

  const uploadAndAttach = useCallback(
    async (file: File) => {
      if (!onImageUpload) return;

      const validTypes = [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Unsupported format. Please use PNG, JPG, GIF, or WebP.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image is too large. Please use an image under 10MB.");
        return;
      }

      setUploading(true);
      const url = await onImageUpload(file);
      setUploading(false);

      if (url) {
        setAttachedImage(url);
        textareaRef.current?.focus();
      }
    },
    [onImageUpload]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await uploadAndAttach(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadAndAttach]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      // Check for pasted images (screenshots, copied images)
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            uploadAndAttach(file);
          }
          return;
        }
      }

      const pastedText = e.clipboardData.getData("text");

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
        // Not a URL
      }
    },
    [onSend, uploadAndAttach]
  );

  const removeAttachment = useCallback(() => {
    setAttachedImage(null);
  }, []);

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-3xl mx-auto">
        {/* Attached image preview */}
        {attachedImage && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="relative group">
              <img
                src={attachedImage}
                alt="Attached"
                className="h-16 rounded-lg border border-border object-cover"
              />
              <button
                onClick={removeAttachment}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm hover:bg-destructive/90 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Image attached — type your message below
            </span>
          </div>
        )}

        <div className="flex items-end gap-2 p-2 rounded-2xl border border-border bg-surface shadow-sm focus-within:border-primary/30 focus-within:shadow-md focus-within:shadow-primary/5 transition-all">
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
            className="flex-shrink-0 p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition disabled:opacity-50"
            title="Upload image"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTextareaInput();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              attachedImage
                ? "Describe what you want to do with this image..."
                : "Describe your email or paste a screenshot..."
            }
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent px-2 py-2 text-sm",
              "placeholder-muted-foreground outline-none",
              "max-h-[200px] scrollbar-thin"
            )}
          />

          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 p-2 rounded-xl bg-destructive text-white hover:bg-destructive/90 transition"
              title="Stop generating"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!text.trim() && !attachedImage}
              className={cn(
                "flex-shrink-0 p-2 rounded-xl transition",
                text.trim() || attachedImage
                  ? "gradient-bg text-white shadow-sm hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
