import type { SupabaseClient, User } from "@supabase/supabase-js";

export const GUEST_GENERATION_LIMIT = 5;
export const CONTACT_EMAIL = "darren@markupbuddy.com";
export const GUEST_LIMIT_MESSAGE = `You've used all ${GUEST_GENERATION_LIMIT} free generations. Contact ${CONTACT_EMAIL} if you want to access this feature more.`;

/** Fired after each chat response so the usage card can refresh its count. */
export const USAGE_CHANGED_EVENT = "markupbuddy:usage-changed";

export const GUEST_FEATURE_MESSAGE = `This feature isn't available on the free trial. Contact ${CONTACT_EMAIL} if you want to access this feature more.`;

/** Visitors who arrive without logging in are signed in anonymously. */
export function isGuest(user: Pick<User, "is_anonymous"> | null | undefined): boolean {
  return !!user?.is_anonymous;
}

export interface GenerationUsage {
  used: number;
  limit: number;
  remaining: number;
}

export async function getGenerationUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<GenerationUsage> {
  const { data } = await supabase
    .from("generation_usage")
    .select("used")
    .eq("user_id", userId)
    .maybeSingle();

  const used = data?.used ?? 0;
  return {
    used,
    limit: GUEST_GENERATION_LIMIT,
    remaining: Math.max(0, GUEST_GENERATION_LIMIT - used),
  };
}
