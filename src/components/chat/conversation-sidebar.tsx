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
} from "lucide-react";
import { cn, truncate } from "@/lib/utils";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ConversationSidebarProps {
  userId: string;
  userEmail: string;
}

export function ConversationSidebar({
  userEmail,
}: ConversationSidebarProps) {
  const { conversations, createConversation, deleteConversation } =
    useConversations();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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

  const sidebar = (
    <div className="flex flex-col h-full w-64 bg-muted border-r border-border">
      <div className="p-3 flex items-center justify-between border-b border-border">
        <span className="font-semibold text-sm text-foreground">
          MarkupBuddy
        </span>
        <button
          onClick={handleNew}
          className="p-1.5 rounded-lg hover:bg-background transition"
          title="New email"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
        {conversations.map((conv) => {
          const isActive = pathname === `/chat/${conv.id}`;
          return (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
              onClick={() => router.push(`/chat/${conv.id}`)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">
                {truncate(conv.title, 30)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                  if (isActive) router.push("/chat");
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-2 space-y-0.5">
        <Link
          href="/brands"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
            pathname === "/brands"
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
          )}
        >
          <Palette className="w-4 h-4" />
          Brands
        </Link>
        <Link
          href="/test-users"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
            pathname === "/test-users"
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
          )}
        >
          <Users className="w-4 h-4" />
          Test Users
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
            pathname === "/settings"
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>

        <div className="flex items-center justify-between px-3 py-2 mt-2">
          <span className="text-xs text-muted-foreground truncate">
            {userEmail}
          </span>
          <button
            onClick={handleLogout}
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition"
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
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-background border border-border shadow-sm"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
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
