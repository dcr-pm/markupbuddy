"use client";

import { useEffect, useCallback, useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { useBrands } from "@/hooks/use-brand";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { BrandPicker } from "@/components/brand/brand-picker";
import { PreviewPanel } from "@/components/email-preview/preview-panel";
import { toast } from "sonner";
import { Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  conversationId: string | null;
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const { brands, activeBrand, setActiveBrand, getBrandContext } = useBrands();
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const {
    messages,
    isStreaming,
    currentHtml,
    error,
    validation,
    isValidating,
    blockMap,
    sendMessage,
    stopStreaming,
    loadMessages,
  } = useChat({
    conversationId,
    brandContext: getBrandContext(),
    onConversationCreated: (id) => {
      window.history.replaceState(null, "", `/chat/${id}`);
    },
  });

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Auto-open mobile preview when HTML is first generated
  useEffect(() => {
    if (currentHtml && !mobilePreviewOpen) {
      // Only on mobile/tablet (lg breakpoint is 1024px)
      if (window.innerWidth < 1024) {
        setMobilePreviewOpen(true);
      }
    }
  }, [currentHtml, mobilePreviewOpen]);

  const handleImageUpload = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        toast.error("Failed to upload image");
        return null;
      }

      const data = await res.json();
      return data.url;
    } catch {
      toast.error("Failed to upload image");
      return null;
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Chat panel */}
      <div className="flex flex-col flex-1 lg:w-1/2 lg:min-w-[400px] lg:border-r border-border">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">
            {conversationId ? "Email Builder" : "New Email"}
          </h2>
          <div className="flex items-center gap-2">
            {/* Mobile preview toggle */}
            <button
              onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
              className={cn(
                "lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                mobilePreviewOpen
                  ? "gradient-bg text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {mobilePreviewOpen ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                  {currentHtml && (
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  )}
                </>
              )}
            </button>
            <BrandPicker
              brands={brands}
              activeBrand={activeBrand}
              onSelect={setActiveBrand}
            />
          </div>
        </div>

        {/* Mobile collapsible preview */}
        <div
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-300 border-b border-border",
            mobilePreviewOpen ? "max-h-[50vh]" : "max-h-0 border-b-0"
          )}
        >
          <div className="h-[50vh]">
            <PreviewPanel html={currentHtml} isStreaming={isStreaming} isValidating={isValidating} validation={validation} blockMap={blockMap} />
          </div>
          <button
            onClick={() => setMobilePreviewOpen(false)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-surface border-t border-border transition"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Collapse preview
          </button>
        </div>

        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          onImageSelected={(prompt, url) => {
            sendMessage(`Use this image for "${prompt}": ${url}`);
          }}
          onSuggestionClick={(text) => sendMessage(text)}
        />

        <ChatInput
          onSend={sendMessage}
          onImageUpload={handleImageUpload}
          isStreaming={isStreaming}
          onStop={stopStreaming}
        />
      </div>

      {/* Desktop preview panel */}
      <div className="hidden lg:flex lg:flex-1 flex-col">
        <PreviewPanel html={currentHtml} isStreaming={isStreaming} isValidating={isValidating} validation={validation} blockMap={blockMap} />
      </div>
    </div>
  );
}
