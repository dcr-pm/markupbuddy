"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, ChatRequest, BrandContext } from "@/types/chat";
import { extractHtmlFromResponse, generateId } from "@/lib/utils";

interface UseChatOptions {
  conversationId: string | null;
  brandContext?: BrandContext | null;
  onConversationCreated?: (id: string) => void;
}

export function useChat({
  conversationId,
  brandContext,
  onConversationCreated,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentHtml, setCurrentHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeConversationIdRef = useRef<string | null>(conversationId);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        // Set currentHtml to the last assistant message with HTML
        const lastHtmlMessage = [...(data.messages || [])]
          .reverse()
          .find((m: Message) => m.role === "assistant" && m.html_output);
        if (lastHtmlMessage) {
          setCurrentHtml(lastHtmlMessage.html_output);
        }
      }
    } catch {
      setError("Failed to load messages");
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string, imageUrl?: string, scrapedHtml?: string) => {
      setError(null);
      setIsStreaming(true);

      // Create conversation if needed
      let convId = activeConversationIdRef.current;
      if (!convId) {
        try {
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: text.slice(0, 50) }),
          });
          const data = await res.json();
          convId = data.id;
          activeConversationIdRef.current = convId;
          onConversationCreated?.(convId!);
        } catch {
          setError("Failed to create conversation");
          setIsStreaming(false);
          return;
        }
      }

      // Optimistic user message
      const userMessage: Message = {
        id: generateId(),
        conversation_id: convId!,
        role: "user",
        content: text,
        html_output: null,
        metadata: { imageUrl, scrapedUrl: scrapedHtml ? "scraped" : undefined },
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Placeholder assistant message
      const assistantMessage: Message = {
        id: generateId(),
        conversation_id: convId!,
        role: "assistant",
        content: "",
        html_output: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const body: ChatRequest = {
          conversationId: convId!,
          message: text,
          imageUrl,
          scrapedHtml,
          brandContext,
        };

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || `Request failed with status ${res.status}`
          );
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);

            try {
              const data = JSON.parse(jsonStr);

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.done) {
                break;
              }

              if (data.text) {
                fullText += data.text;

                // Update assistant message
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: fullText }
                      : m
                  )
                );

                // Extract HTML for live preview
                const html = extractHtmlFromResponse(fullText);
                if (html) {
                  setCurrentHtml(html);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id
                        ? { ...m, html_output: html }
                        : m
                    )
                  );
                }
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const errorMsg =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMsg);
        // Remove the placeholder assistant message on error
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantMessage.id)
        );
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [brandContext, onConversationCreated]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    currentHtml,
    error,
    sendMessage,
    stopStreaming,
    loadMessages,
    setMessages,
    setCurrentHtml,
  };
}
