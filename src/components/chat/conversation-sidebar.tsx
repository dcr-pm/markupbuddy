"use client";

import { useConversations } from "@/hooks/use-conversation";
import { useRouter, usePathname } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Trash2,
  Settings,
  Users,
  Palette,
  Menu,
  X,
  LogOut,
  CheckSquare,
  Square,
  Pencil,
  Check,
} from "lucide-react";
import { cn, truncate } from "@/lib/utils";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ConversationSidebarProps {
  userId: string;
  userEmail: string;
}

export function ConversationSidebar({
  userEmail,
}: ConversationSidebarProps) {
  const { conversations, createConversation, renameConversation, deleteConversation, deleteMultipleConversations } =
    useConversations();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleNew = async () => {
    const id = await createConversation();
    if (id) router.push(`/chat/${id}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const activeDeleted = ids.some((id) => pathname === `/chat/${id}`);
    await deleteMultipleConversations(ids);
    setSelectedIds(new Set());
    setSelectMode(false);
    if (activeDeleted) router.push("/chat");
  };

  const startRename = (conv: { id: string; title: string }) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const saveRename = async () => {
    if (editingId && editTitle.trim()) {
      await renameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const userInitial = (userEmail?.[0] || "U").toUpperCase();

  const sidebar = (
    <div className="flex flex-col h-full w-64 bg-gradient-to-b from-muted via-muted to-background border-r border-border">
      {/* Brand header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="MarkupBuddy" width={32} height={32} className="rounded-lg shadow-sm" />
          <span className="font-semibold text-sm text-foreground">
            Markup<span className="gradient-text">Buddy</span>
          </span>
        </div>
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl gradient-bg text-white text-xs font-medium hover:opacity-90 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New Email
        </button>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5">
        {selectMode ? (
          <>
            <span className="text-[10px] text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-1">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="p-1 rounded text-destructive hover:bg-destructive/10 transition"
                  title="Delete selected"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={exitSelectMode}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-[10px] text-muted-foreground">Chats</span>
            {conversations.length > 0 && (
              <button
                onClick={() => setSelectMode(true)}
                className="p-1 rounded text-muted-foreground/50 hover:text-foreground transition"
                title="Select chats"
              >
                <CheckSquare className="w-3 h-3" />
              </button>
            )}
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 pt-0 space-y-0.5">
        {conversations.map((conv) => {
          const isActive = pathname === `/chat/${conv.id}`;
          const isSelected = selectedIds.has(conv.id);
          return (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all",
                isActive && !selectMode
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                selectMode && isSelected && "bg-primary/5 border border-primary/20"
              )}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(conv.id);
                } else {
                  router.push(`/chat/${conv.id}`);
                }
              }}
            >
              {selectMode ? (
                isSelected ? (
                  <CheckSquare className="w-4 h-4 flex-shrink-0 text-primary" />
                ) : (
                  <Square className="w-4 h-4 flex-shrink-0 text-muted-foreground/40" />
                )
              ) : (
                <MessageSquare className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
              )}
              {editingId === conv.id ? (
                <input
                  ref={editInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs bg-background border border-primary/30 rounded px-1.5 py-0.5 outline-none focus:border-primary"
                />
              ) : (
                <span className="flex-1 truncate text-xs">
                  {truncate(conv.title, 28)}
                </span>
              )}
              {!selectMode && editingId !== conv.id && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(conv);
                    }}
                    className="p-1 rounded-lg hover:bg-primary/10 hover:text-primary transition"
                    title="Rename"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                      if (isActive) router.push("/chat");
                    }}
                    className="p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-2 space-y-0.5">
        <Link
          href="/chat"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all",
            pathname.startsWith("/chat")
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
          )}
        >
          <MessageSquare className={cn("w-4 h-4", pathname.startsWith("/chat") && "text-primary")} />
          <span className="text-xs">Chat</span>
        </Link>
        <Link
          href="/brands"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all",
            pathname.startsWith("/brands")
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
          )}
        >
          <Palette className={cn("w-4 h-4", pathname.startsWith("/brands") && "text-purple-500")} />
          <span className="text-xs">Brands</span>
        </Link>
        <Link
          href="/test-users"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all",
            pathname === "/test-users"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
          )}
        >
          <Users className={cn("w-4 h-4", pathname === "/test-users" && "text-teal-500")} />
          <span className="text-xs">Test Users</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all",
            pathname === "/settings"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
          )}
        >
          <Settings className={cn("w-4 h-4", pathname === "/settings" && "text-muted-foreground")} />
          <span className="text-xs">Settings</span>
        </Link>

        <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1">
          <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {userInitial}
          </div>
          <span className="text-xs text-muted-foreground truncate flex-1">
            {userEmail}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-xl bg-background border border-border shadow-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 transform transition-transform",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebar}</div>
    </>
  );
}
