import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Only check auth if Supabase is configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        redirect("/chat");
      }
    } catch {
      // Supabase not available — show landing page
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Markup<span className="text-blue-600">Buddy</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
          Build production-ready HTML emails with AI. Just describe what you want
          and get pixel-perfect, ESP-ready email HTML — instantly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-8 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Sign In
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
          <div className="text-left p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Any Input
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Text, screenshots, Figma exports, URLs, or sketches — the AI
              handles it all.
            </p>
          </div>
          <div className="text-left p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Brand Aware
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Save your brand profile once. Every email auto-applies your
              colors, fonts, and tone.
            </p>
          </div>
          <div className="text-left p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              ESP Ready
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              AMPscript, Liquid, Handlebars — personalization in your ESP&apos;s
              native language.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
