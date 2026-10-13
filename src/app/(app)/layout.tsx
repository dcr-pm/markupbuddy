import { createClient } from "@/lib/supabase/server";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { getGenerationUsage, isGuest } from "@/lib/guest";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // The middleware starts a guest session for every visitor, so this only
    // happens when anonymous sign-ins are disabled in Supabase.
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          MarkupBuddy is temporarily unavailable. Please try again in a few minutes.
        </p>
      </div>
    );
  }

  const guest = isGuest(user);
  const usage = guest ? await getGenerationUsage(supabase, user.id) : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <ConversationSidebar
        userId={user.id}
        userEmail={user.email || ""}
        isGuest={guest}
        generationUsage={usage}
      />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
