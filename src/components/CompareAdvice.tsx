"use client";

import { useState } from "react";
import type { Comparison } from "@/lib/types";

// On-demand AI half of the compare view. The deterministic numeric deltas are
// server-rendered; this button POSTs the two session ids to /api/compare to get
// the qualitative "what improved / slipped / focus next" diff, mirroring how the
// feedback report is generated on demand rather than on every page load. Hidden
// entirely (a quiet note shown) when no LLM key is configured.
function Section({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-fg">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CompareAdvice({ a, b, llmEnabled }: { a: string; b: string; llmEnabled: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Comparison | null>(null);
  const [error, setError] = useState<string>("");

  async function run() {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a, b }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Couldn't generate the comparison. Try again.");
        setState("error");
        return;
      }
      setResult(data.comparison as Comparison);
      setState("done");
    } catch {
      setError("Network error — check your connection and try again.");
      setState("error");
    }
  }

  if (!llmEnabled) {
    return (
      <div className="deck-card p-6 text-sm text-muted">
        AI progress notes need an LLM API key (set <span className="font-mono">ANTHROPIC_API_KEY</span> or{" "}
        <span className="font-mono">GEMINI_API_KEY</span>). The numeric deltas above are always available.
      </div>
    );
  }

  return (
    <div className="deck-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">AI progress notes</h2>
        {state !== "done" && (
          <button
            type="button"
            onClick={run}
            disabled={state === "loading"}
            className="btn px-4 py-2 text-sm disabled:opacity-60"
          >
            {state === "loading" ? "Analyzing…" : "Generate AI progress notes"}
          </button>
        )}
      </div>

      {state === "idle" && (
        <p className="mt-3 text-sm text-muted">
          Have the coach read both reports and tell you what got better, what slipped, and what to focus on next.
        </p>
      )}
      {state === "error" && (
        <p className="mt-3 text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
      {state === "done" && result && (
        <div className="mt-4 flex flex-col gap-6">
          {result.summary && (
            <p className="rounded-xl border border-edge bg-surface p-4 text-sm leading-relaxed text-fg">{result.summary}</p>
          )}
          <div className="grid gap-6 sm:grid-cols-3">
            <Section title="What improved" items={result.improved} dot="bg-good" />
            <Section title="What slipped" items={result.regressed} dot="bg-warn" />
            <Section title="Focus next" items={result.focus} dot="bg-accent" />
          </div>
        </div>
      )}
    </div>
  );
}
