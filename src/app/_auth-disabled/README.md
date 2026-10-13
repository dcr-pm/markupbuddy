# Login / signup (disabled)

These pages are switched off while MarkupBuddy runs as an open free trial:
visitors get a guest session automatically (see `src/lib/supabase/middleware.ts`).
Folders starting with `_` are private in Next.js, so nothing here is routed.

To bring them back:

1. Rename this folder back to `src/app/(auth)`.
2. In `src/lib/supabase/middleware.ts`, remove the redirect of the auth pages
   to `/chat`, and go back to redirecting signed-out visitors to `/login`
   instead of starting a guest session.
3. Restore the Sign In / signup links on the landing page (`src/app/page.tsx`)
   and the `/login` redirect in `src/app/(app)/layout.tsx`.
