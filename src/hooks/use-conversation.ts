"use client";

import { useState, useCallback, useEffect } from "react";
import type { Conversation } from "@/types/chat";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(
    async (title?: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title || "New Email" }),
        });
        if (res.ok) {
          const data = await res.json();
          await fetchConversations();
          return data.id;
        }
      } catch {
        // silently fail
      }
      return null;
    },
    [fetchConversations]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
        await fetchConversations();
      } catch {
        // silently fail
      }
    },
    [fetchConversations]
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      try {
        await fetch("/api/conversations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, title }),
        });
        await fetchConversations();
      } catch {
        // silently fail
      }
    },
    [fetchConversations]
  );

  const deleteMultipleConversations = useCallback(
    async (ids: string[]) => {
      try {
        await Promise.all(
          ids.map((id) =>
            fetch(`/api/conversations?id=${id}`, { method: "DELETE" })
          )
        );
        await fetchConversations();
      } catch {
        // silently fail
      }
    },
    [fetchConversations]
  );

  return {
    conversations,
    loading,
    createConversation,
    renameConversation,
    deleteConversation,
    deleteMultipleConversations,
    refetch: fetchConversations,
  };
}
