"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

interface ClarificationQuestion {
  label: string;
  options: string[];
}

interface ClarificationCardProps {
  intro: string;
  questions: ClarificationQuestion[];
  outro: string;
  onSubmit: (answers: string) => void;
}

export function ClarificationCard({
  intro,
  questions,
  outro,
  onSubmit,
}: ClarificationCardProps) {
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (qIndex: number, option: string) => {
    if (submitted) return;
    setSelections((prev) => {
      if (prev[qIndex] === option) {
        const next = { ...prev };
        delete next[qIndex];
        return next;
      }
      return { ...prev, [qIndex]: option };
    });
  };

  const handleSubmit = () => {
    if (submitted) return;
    const parts: string[] = [];
    questions.forEach((q, i) => {
      const answer = selections[i] || customInputs[i];
      if (answer) {
        parts.push(`${q.label}: ${answer}`);
      }
    });
    if (parts.length === 0) {
      onSubmit("go ahead");
    } else {
      onSubmit(parts.join("\n"));
    }
    setSubmitted(true);
  };

  const handleGoAhead = () => {
    if (submitted) return;
    onSubmit("go ahead");
    setSubmitted(true);
  };

  const answeredCount = Object.keys(selections).length + Object.keys(customInputs).filter(k => customInputs[Number(k)]?.trim()).length;

  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm text-foreground">{intro}</p>

      {questions.map((q, i) => (
        <div key={i} className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">
            {i + 1}. {q.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(i, opt)}
                disabled={submitted}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs border transition-all",
                  selections[i] === opt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                  submitted && "opacity-60 cursor-default"
                )}
              >
                {opt}
              </button>
            ))}
            {!selections[i] && (
              <input
                type="text"
                placeholder="Other..."
                disabled={submitted}
                className="px-3 py-1.5 rounded-full text-xs border border-border bg-background/50 text-foreground placeholder:text-muted-foreground/50 w-24 focus:w-40 transition-all focus:outline-none focus:border-primary/40"
                value={customInputs[i] || ""}
                onChange={(e) =>
                  setCustomInputs((prev) => ({ ...prev, [i]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customInputs[i]?.trim()) {
                    handleSubmit();
                  }
                }}
              />
            )}
          </div>
        </div>
      ))}

      {!submitted && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={answeredCount === 0}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all",
              answeredCount > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="w-3 h-3" />
            Send answers ({answeredCount}/{questions.length})
          </button>
          <button
            onClick={handleGoAhead}
            className="px-4 py-2 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            Just go ahead
          </button>
        </div>
      )}

      {submitted && (
        <p className="text-xs text-muted-foreground italic">
          {answeredCount > 0 ? "Answers sent" : "Going with best judgment"}
        </p>
      )}

      {outro && !submitted && (
        <p className="text-xs text-muted-foreground">{outro}</p>
      )}
    </div>
  );
}

/**
 * Extract options from question text.
 * Handles: (opt1, opt2, opt3?), "X, Y, or Z?", "X or Y?"
 */
function extractOptions(text: string): string[] {
  // Try parenthesized options first: (opt1, opt2, opt3?)
  const parensMatch = text.match(/\(([^)]+)\)/);
  if (parensMatch) {
    const opts = parensMatch[1]
      .split(/[,?]/)
      .map((o) => o.replace(/\bor\b/gi, "").trim())
      .filter((o) => o.length > 0 && o.length < 50);
    if (opts.length >= 2) return opts;
  }

  // Try "or"-separated: "X, or Y?" or "X or Y?"
  const cleaned = text.replace(/\?+$/, "").trim();
  const orParts = cleaned.split(/,?\s+or\s+/i);
  if (orParts.length >= 2) {
    const opts = orParts
      .map((o) => o.replace(/^.*?[—–\-:]\s*/, "").trim())
      .filter((o) => o.length > 0 && o.length < 50);
    if (opts.length >= 2) return opts;
  }

  // Try comma-separated list: "X, Y, Z"
  const commaParts = cleaned.split(/,\s*/);
  if (commaParts.length >= 3) {
    const opts = commaParts
      .map((o) => o.replace(/\bor\b/gi, "").trim())
      .filter((o) => o.length > 0 && o.length < 50);
    if (opts.length >= 2) return opts;
  }

  return [];
}

/**
 * Detect if an assistant message is a clarification response and parse it.
 * Returns null if it's not a clarification.
 */
export function parseClarification(content: string): {
  intro: string;
  questions: ClarificationQuestion[];
  outro: string;
} | null {
  const questions: ClarificationQuestion[] = [];

  // Pattern 1: **Bold** — rest (Gemini style)
  // Pattern 2: **Bold**: rest
  // Pattern 3: Bold — rest (no markdown)
  // Pattern 4: Bold: rest (plain text)
  const patterns = [
    /\d+\.\s+\*\*(\w[\w\s/]*?)\*\*\s*[—–\-:]\s*(.+)/g,
    /\d+\.\s+(\w[\w\s/]*?)\s*[—–]\s*(.+)/g,
    /\d+\.\s+(\w[\w\s/]*?):\s*(.+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    const found: ClarificationQuestion[] = [];

    while ((match = pattern.exec(content)) !== null) {
      const label = match[1].trim();
      const rest = match[2].trim();

      // Skip if label is too long (probably not a question label)
      if (label.length > 30) continue;

      const options = extractOptions(rest);
      if (options.length >= 2) {
        found.push({ label, options });
      }
    }

    if (found.length >= 2) {
      questions.push(...found);
      break;
    }
  }

  if (questions.length < 2) return null;

  // Extract intro (text before first question)
  const firstQuestionIndex = content.search(/\d+\.\s+(?:\*\*)?[\w]/);
  const intro = firstQuestionIndex > 0
    ? content.slice(0, firstQuestionIndex).replace(/[*#>]/g, "").trim()
    : "";

  // Extract outro (text after last question)
  const lastQuestionMark = content.lastIndexOf("?");
  const outro = lastQuestionMark > 0
    ? content.slice(lastQuestionMark + 1).replace(/[*#>)\]]/g, "").replace(/or just say.*$/i, "").replace(/just say.*$/i, "").trim()
    : "";

  return { intro, questions, outro };
}
