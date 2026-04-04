import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";

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
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ConversationSidebar userId={user.id} userEmail={user.email || ""} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
