import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Dev bypass — skip auth entirely in local development
  if (process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true") {
    return NextResponse.next({ request });
  }

  // Skip if env vars not set or empty
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Login and signup are closed — everyone goes straight to the builder
  const isClosedAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  if (isClosedAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // The landing page and auth callback don't need a session; skipping them
  // also keeps crawlers from creating guest accounts.
  const isPublicPage = pathname === "/" || pathname.startsWith("/callback");

  if (!user && !isPublicPage) {
    // Start a guest session (Supabase anonymous sign-in). setAll above
    // writes the new session cookies onto supabaseResponse.
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("[middleware] Guest sign-in failed:", error.message);
    }
  }

  return supabaseResponse;
}
