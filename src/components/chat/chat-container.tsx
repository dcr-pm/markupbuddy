"use client";

import { useEffect, useCallback } from "react";
import { useChat } from "@/hooks/use-chat";
import { useBrands } from "@/hooks/use-brand";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { BrandPicker } from "@/components/brand/brand-picker";
import { PreviewPanel } from "@/components/email-preview/preview-panel";
import { toast } from "sonner";

interface ChatContainerProps {
  conversationId: string | null;
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const { brands, activeBrand, setActiveBrand, getBrandContext } = useBrands();

  const {
    messages,
    isStreaming,
    currentHtml,
    error,
    sendMessage,
    stopStreaming,
    loadMessages,
  } = useChat({
    conversationId,
    brandContext: getBrandContext(),
    onConversationCreated: (id) => {
      // Update URL without unmounting — preserves streaming state
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
    <div className="flex h-full">
      {/* Chat panel */}
      <div className="flex flex-col w-full lg:w-1/2 lg:min-w-[400px] border-r border-border">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">
            {conversationId ? "Email Builder" : "New Email"}
          </h2>
          <BrandPicker
            brands={brands}
            activeBrand={activeBrand}
            onSelect={setActiveBrand}
          />
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

      {/* Preview panel — hidden on mobile, shown on lg+ */}
      <div className="hidden lg:flex lg:flex-1 flex-col">
        <PreviewPanel html={currentHtml} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
