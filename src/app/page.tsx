import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
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
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-accent/50 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-8 border border-primary/10">
              <span className="w-2 h-2 rounded-full gradient-bg animate-pulse" />
              AI-powered email builder
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
              Build emails that<br />
              <span className="gradient-text">convert</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Describe what you want. Get production-ready, responsive HTML emails
              in seconds — no coding required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="gradient-bg px-8 py-3.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition shadow-lg shadow-primary/25"
              >
                Start Building Free
              </Link>
              <Link
                href="/login"
                className="px-8 py-3.5 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Product mockup */}
          <div className="mt-16 animate-fade-in-up delay-300 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-border bg-surface shadow-2xl shadow-primary/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                    markupbuddy.com/chat
                  </div>
                </div>
              </div>
              <div className="flex h-64 sm:h-80">
                {/* Chat side mockup */}
                <div className="w-1/2 border-r border-border p-4 flex flex-col">
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-end">
                      <div className="gradient-bg text-white text-xs px-3 py-2 rounded-xl rounded-br-md max-w-[80%]">
                        Build me a product launch email with a hero banner and 3-column features
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full gradient-bg opacity-20 flex-shrink-0" />
                      <div className="bg-muted text-xs px-3 py-2 rounded-xl rounded-bl-md max-w-[80%] text-muted-foreground">
                        Great choice! Let me ask a few quick questions to get the design perfect...
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full flex-shrink-0" />
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-[10px] border border-primary/10">Modern & sleek</span>
                        <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px]">Bold & vibrant</span>
                        <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px]">Minimal</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border">
                    <div className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                      Describe your email...
                    </div>
                  </div>
                </div>
                {/* Preview side mockup */}
                <div className="w-1/2 bg-muted/30 p-4 flex items-center justify-center">
                  <div className="w-full max-w-[180px] sm:max-w-[220px] bg-background rounded-lg shadow-sm border border-border overflow-hidden">
                    <div className="h-16 sm:h-20 gradient-bg opacity-80" />
                    <div className="p-3 space-y-2">
                      <div className="h-2 bg-foreground/10 rounded w-3/4" />
                      <div className="h-2 bg-foreground/5 rounded w-full" />
                      <div className="h-2 bg-foreground/5 rounded w-2/3" />
                      <div className="mt-3 h-6 gradient-bg rounded text-[8px] text-white flex items-center justify-center font-medium opacity-90">
                        Shop Now
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { stat: "10x", label: "Faster than hand-coding" },
              { stat: "100%", label: "Responsive output" },
              { stat: "50+", label: "Email client tested" },
              { stat: "Free", label: "To get started" },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-2xl sm:text-3xl font-bold gradient-text">{item.stat}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything you need to build<br />
            <span className="gradient-text">professional emails</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From concept to production-ready HTML in a single conversation.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl border border-border bg-background hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white text-lg mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-14">
            Three steps to a <span className="gradient-text">perfect email</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[60%] w-[80%] h-px border-t-2 border-dashed border-border" />
                )}
                <div className="w-12 h-12 rounded-full gradient-bg text-white text-lg font-bold flex items-center justify-center mx-auto mb-4 relative z-10">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to build better emails?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join marketers who are shipping beautiful, responsive emails in minutes instead of hours.
          </p>
          <Link
            href="/signup"
            className="inline-block gradient-bg px-10 py-4 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition shadow-lg shadow-primary/25"
          >
            Get Started Free
          </Link>
          <p className="text-xs text-muted-foreground mt-4">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold text-foreground">
            Markup<span className="gradient-text">Buddy</span>
          </span>
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MarkupBuddy. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: "💬",
    title: "Conversational Builder",
    description: "Just describe what you want in plain English. The AI asks smart questions to nail the design.",
  },
  {
    icon: "🎨",
    title: "Brand Aware",
    description: "Save your brand profile once — colors, fonts, tone. Every email auto-applies your guidelines.",
  },
  {
    icon: "📱",
    title: "Fully Responsive",
    description: "Every email is mobile-optimized and tested across 50+ email clients automatically.",
  },
  {
    icon: "⚡",
    title: "Instant Preview",
    description: "See your email render in real-time as it is built. Toggle between desktop and mobile views.",
  },
  {
    icon: "🔧",
    title: "ESP Ready",
    description: "AMPscript, Liquid, Handlebars — personalization in your ESP's native syntax, built in.",
  },
  {
    icon: "🔒",
    title: "Standards Compliant",
    description: "CAN-SPAM, GDPR, accessibility, alt text, unsubscribe — all handled automatically.",
  },
];

const STEPS = [
  {
    title: "Describe",
    description: "Tell the AI what email you need. Upload a screenshot, paste a URL, or just type a description.",
  },
  {
    title: "Refine",
    description: "Review the design questions, approve the block plan, and iterate until it is exactly right.",
  },
  {
    title: "Export",
    description: "Copy the production-ready HTML, download it, or send a test email directly to your inbox.",
  },
];
