import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const DEV_BYPASS = process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true";

// Use a real profile ID so RLS policies allow DB operations.
// Set DEV_AUTH_USER_ID in .env.local to match an existing profiles row.
const DEV_USER = {
  id: process.env.DEV_AUTH_USER_ID || "c6dab08d-5531-4780-89f4-e6bca64a0df0",
  email: process.env.DEV_AUTH_USER_EMAIL || "dev@localhost",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
};

/**
 * Creates a Supabase client. In dev with DEV_AUTH_BYPASS=true,
 * uses the service role key (bypasses RLS) and fakes auth.getUser().
 */
export async function createClient() {
  if (DEV_BYPASS) {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url?.trim() || !serviceKey?.trim()) {
      throw new Error("DEV_AUTH_BYPASS requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createServiceClient(url, serviceKey) as any;
    // Override auth methods so app code gets a valid user
    const originalAuth = client.auth;
    client.auth = {
      ...originalAuth,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getUser: async () => ({ data: { user: DEV_USER as any }, error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getSession: async () => ({ data: { session: { user: DEV_USER } as any }, error: null }),
      signOut: async () => ({ error: null }),
    };
    return client as ReturnType<typeof createServerClient>;
  }

  return getRealClient();
}

async function getRealClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    throw new Error("Supabase URL and Anon Key are required. Check your .env.local file.");
  }

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
