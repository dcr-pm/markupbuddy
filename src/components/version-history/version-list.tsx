"use client";

import { useState, useEffect, useCallback } from "react";
import type { Version } from "@/types/version";
import { formatDate, cn } from "@/lib/utils";
import { History, ChevronRight } from "lucide-react";

interface VersionListProps {
  conversationId: string;
  onSelectVersion: (version: Version) => void;
}

export function VersionList({
  conversationId,
  onSelectVersion,
}: VersionListProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    const res = await fetch(
      `/api/versions?conversationId=${conversationId}`
    );
    if (res.ok) {
      const data = await res.json();
      setVersions(data.versions || []);
    }
  }, [conversationId]);

  useEffect(() => {
    if (open) fetchVersions();
  }, [open, fetchVersions]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
      >
        <History className="w-3.5 h-3.5" />
        History
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-border bg-background shadow-lg z-50 max-h-80 overflow-y-auto scrollbar-thin">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-medium">Version History</h3>
          </div>
          {versions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No versions yet.
            </p>
          ) : (
            <div className="p-2 space-y-1">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedId(v.id);
                    onSelectVersion(v);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-muted transition",
                    selectedId === v.id && "bg-muted"
                  )}
                >
                  <div>
                    <span className="font-medium">v{v.version_number}</span>
                    <span className="text-muted-foreground ml-2">
                      {v.change_summary}
                    </span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(v.created_at)}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
