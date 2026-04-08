"use client";

import { useState, useEffect, useCallback } from "react";
import type { TestUser } from "@/types/test-user";
import { X, Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SendDialogProps {
  html: string;
  conversationId: string;
  scriptingEngine?: string;
  onClose: () => void;
}

interface SendResult {
  test_user_id: string;
  name: string;
  email: string;
  status: "pending" | "sent" | "failed";
  error?: string;
}

export function SendDialog({
  html,
  conversationId,
  scriptingEngine,
  onClose,
}: SendDialogProps) {
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("Test Email");
  const [fromName, setFromName] = useState("MarkupBuddy");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);

  const fetchTestUsers = useCallback(async () => {
    const res = await fetch("/api/test-users");
    if (res.ok) {
      const data = await res.json();
      setTestUsers(data.testUsers);
      // Select all by default
      setSelectedIds(new Set(data.testUsers.map((u: TestUser) => u.id)));
    }
  }, []);

  useEffect(() => {
    fetchTestUsers();
  }, [fetchTestUsers]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;

    setSending(true);
    try {
      const res = await fetch("/api/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          html,
          recipients: Array.from(selectedIds),
          subject,
          fromName,
          scriptingEngine,
        }),
      });

      const data = await res.json();
      setResults(data.results);
    } catch {
      setResults([
        {
          test_user_id: "",
          name: "Error",
          email: "",
          status: "failed",
          error: "Network error",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-background rounded-xl border border-border shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Send Test Email</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                From Name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Recipients
            </label>
            {testUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No test users. Add them in the Test Users page.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {testUsers.map((tu) => (
                  <label
                    key={tu.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition",
                      selectedIds.has(tu.id)
                        ? "bg-accent border border-primary/20"
                        : "border border-border hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tu.id)}
                      onChange={() => toggleUser(tu.id)}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{tu.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {tu.email}
                      </span>
                    </div>
                    {tu.tier && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {tu.tier}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {results && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">Results</h3>
              {results.map((r, i) => (
                <div
                  key={`${r.email}-${i}`}
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted"
                >
                  {r.status === "sent" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span>
                    {r.name} ({r.email})
                  </span>
                  {r.error && (
                    <span className="text-xs text-destructive ml-auto">
                      {r.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition"
          >
            {results ? "Done" : "Cancel"}
          </button>
          {!results && (
            <button
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending..." : `Send to ${selectedIds.size}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
