"use client";

import { useState, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AudienceList } from "@/types/campaign";

interface CampaignDialogProps {
  html: string;
  conversationId: string;
  brandId?: string | null;
  onClose: () => void;
  onCreated?: (campaignId: string) => void;
}

export function CampaignDialog({
  html,
  conversationId,
  brandId,
  onClose,
  onCreated,
}: CampaignDialogProps) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [fromName, setFromName] = useState("MarkupBuddy");
  const [replyTo, setReplyTo] = useState("");
  const [listId, setListId] = useState<string>("");
  const [lists, setLists] = useState<AudienceList[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    fetch("/api/audiences")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLists(data);
      })
      .catch(() => {})
      .finally(() => setLoadingLists(false));
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim() || null,
          preheader: preheader.trim() || null,
          fromName: fromName.trim() || null,
          replyTo: replyTo.trim() || null,
          htmlContent: html,
          conversationId,
          brandId: brandId || null,
          listId: listId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");
      toast.success("Campaign created as draft");
      onCreated?.(data.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Create Campaign</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Campaign Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Spring Sale Announcement"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Don't miss our spring sale!"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Preheader Text
            </label>
            <input
              type="text"
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              placeholder="Preview text shown after subject line"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                From Name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Sender name"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Reply-To
              </label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="reply@company.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Audience List
            </label>
            {loadingLists ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading lists...
              </div>
            ) : lists.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No audience lists yet. Create one in the Audiences page first.
              </p>
            ) : (
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Select a list (optional for draft)</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.contact_count} contacts)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Create Draft
          </button>
        </div>
      </div>
    </div>
  );
}
