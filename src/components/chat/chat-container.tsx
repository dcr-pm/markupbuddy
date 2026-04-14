"use client";

import { useEffect, useCallback, useState, startTransition, useRef } from "react";
import { useChat } from "@/hooks/use-chat";
import { useBrands } from "@/hooks/use-brand";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { BrandPicker } from "@/components/brand/brand-picker";
import { PreviewPanel } from "@/components/email-preview/preview-panel";
import { SendDialog } from "@/components/test-send/send-dialog";
import { deleteBlockFromHtml, swapBlocksInHtml, renameBlockInHtml } from "@/lib/mjml/block-labels";
import type { BlockAction } from "@/components/email-preview/preview-frame";
import { toast } from "sonner";
import { Eye, EyeOff, ChevronUp, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  conversationId: string | null;
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const { brands, activeBrand, setActiveBrand, getBrandContext } = useBrands();
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const {
    messages,
    isStreaming,
    streamPhase,
    currentHtml,
    currentMjml,
    error,
    validation,
    isValidating,
    blockMap,
    sendMessage,
    stopStreaming,
    loadMessages,
    setCurrentHtml,
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

  // Persist currentHtml to the last assistant message whenever it changes
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentHtml || !conversationId || isStreaming) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch("/api/conversations/save-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, html: currentHtml }),
      }).catch(() => {});
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [currentHtml, conversationId, isStreaming]);

  // Auto-open mobile preview when HTML is first generated
  useEffect(() => {
    if (currentHtml && !mobilePreviewOpen) {
      // Only on mobile/tablet (lg breakpoint is 1024px)
      if (window.innerWidth < 1024) {
        startTransition(() => setMobilePreviewOpen(true));
      }
    }
  }, [currentHtml, mobilePreviewOpen]);

  const handleBlockAction = useCallback((action: BlockAction) => {
    if (!currentHtml) return;
    let updated: string;
    if (action.type === "delete") {
      updated = deleteBlockFromHtml(currentHtml, action.blockNumber);
    } else if (action.type === "move-up") {
      updated = swapBlocksInHtml(currentHtml, action.blockNumber - 1, action.blockNumber);
    } else if (action.type === "move-down") {
      updated = swapBlocksInHtml(currentHtml, action.blockNumber, action.blockNumber + 1);
    } else {
      return;
    }
    setCurrentHtml(updated);
  }, [currentHtml, setCurrentHtml]);

  const handleBlockRename = useCallback((blockNumber: number, newName: string) => {
    if (!currentHtml) return;
    setCurrentHtml(renameBlockInHtml(currentHtml, blockNumber, newName));
  }, [currentHtml, setCurrentHtml]);

  const handleElementReorder = useCallback((html: string) => {
    setCurrentHtml(html);
  }, [setCurrentHtml]);

  const handleRefreshPreview = useCallback(() => {
    if (conversationId) {
      loadMessages(conversationId);
      toast.info("Reloading preview...");
    }
  }, [conversationId, loadMessages]);

  // Detect "send test to email@..." or "send this to email@..." in chat
  const handleSend = useCallback(
    (message: string, imageUrl?: string) => {
      const sendMatch = message.match(
        /^s?end\s+(?:test|this|email|it|a test)?\s*(?:to\s+)?([^\s,]+@[^\s,]+(?:\.[^\s,]+)+)/i
      );
      if (sendMatch) {
        const email = sendMatch[1];
        if (!currentHtml) {
          toast.error("No email to send yet. Build an email first, then try again.");
          return;
        }
        if (!conversationId) {
          toast.error("Save the conversation first before sending a test.");
          return;
        }
        toast.promise(
          fetch("/api/test-send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId,
              html: currentHtml,
              directEmail: email,
              subject: "Test Email",
              fromName: "MarkupBuddy",
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error((await res.json()).error || "Send failed");
          }),
          {
            loading: `Sending test to ${email}...`,
            success: `Test email sent to ${email}!`,
            error: (err) => err.message,
          }
        );
        return;
      }
      sendMessage(message, imageUrl);
    },
    [currentHtml, conversationId, sendMessage]
  );

  const handleImageUpload = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Upload failed: ${errData.error || res.statusText}`);
        return null;
      }

      const data = await res.json();
      return data.url;
    } catch {
      toast.error("Could not upload image. Please check your connection and try again.");
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
            <PreviewPanel html={currentHtml} mjml={currentMjml} isStreaming={isStreaming} isValidating={isValidating} validation={validation} blockMap={blockMap} onSendTest={currentHtml ? () => setShowSendDialog(true) : undefined} onBlockAction={handleBlockAction} onBlockRename={handleBlockRename} onElementReorder={handleElementReorder} onRefreshPreview={conversationId ? handleRefreshPreview : undefined} />
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
          streamPhase={streamPhase}
          onImageSelected={(prompt, url) => {
            sendMessage(`Use this image for "${prompt}": ${url}`);
          }}
          onSuggestionClick={(text) => sendMessage(text)}
          onRetry={() => {
            // Resend the last user message
            const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
            if (lastUserMsg) sendMessage(lastUserMsg.content);
          }}
        />

        <ChatInput
          onSend={handleSend}
          onImageUpload={handleImageUpload}
          isStreaming={isStreaming}
          onStop={stopStreaming}
        />
      </div>

      {/* Desktop preview panel */}
      <div className="hidden lg:flex lg:flex-1 flex-col">
        <PreviewPanel html={currentHtml} mjml={currentMjml} isStreaming={isStreaming} isValidating={isValidating} validation={validation} blockMap={blockMap} onSendTest={currentHtml ? () => setShowSendDialog(true) : undefined} onBlockAction={handleBlockAction} onBlockRename={handleBlockRename} onElementReorder={handleElementReorder} onRefreshPreview={conversationId ? handleRefreshPreview : undefined} />
      </div>

      {showSendDialog && currentHtml && conversationId && (
        <SendDialog
          html={currentHtml}
          conversationId={conversationId}
          onClose={() => setShowSendDialog(false)}
        />
      )}
    </div>
  );
}
