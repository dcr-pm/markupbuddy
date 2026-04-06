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

  const userInitial = (userEmail?.[0] || "U").toUpperCase();

  const sidebar = (
    <div className="flex flex-col h-full w-64 bg-gradient-to-b from-muted via-muted to-background border-r border-border">
      {/* Brand header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold shadow-sm">
            M
          </div>
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

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
        {conversations.map((conv) => {
          const isActive = pathname === `/chat/${conv.id}`;
          return (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
              onClick={() => router.push(`/chat/${conv.id}`)}
            >
              <MessageSquare className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
              <span className="flex-1 truncate text-xs">
                {truncate(conv.title, 28)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                  if (isActive) router.push("/chat");
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-2 space-y-0.5">
        <Link
          href="/brands"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all",
            pathname === "/brands"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
          )}
        >
          <Palette className={cn("w-4 h-4", pathname === "/brands" && "text-purple-500")} />
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
