"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    setTimeout(() => {
      router.push("/chat");
    }, 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Markup<span className="gradient-text">Buddy</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set your new password
          </p>
        </div>

        <div className="bg-background rounded-xl shadow-sm border border-border p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Password updated</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been reset. Redirecting to your inbox...
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl gradient-bg px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update password"}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
