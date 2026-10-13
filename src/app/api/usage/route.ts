import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGenerationUsage, isGuest } from "@/lib/guest";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGuest(user)) {
    return NextResponse.json({ guest: false, usage: null });
  }

  const usage = await getGenerationUsage(supabase, user.id);
  return NextResponse.json({ guest: true, usage });
}
