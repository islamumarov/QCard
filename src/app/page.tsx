"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RadioGroup } from "@/components/RadioGroup";
import { DEFAULT_LEVEL, isLevelId, LEVEL_LIST } from "@/lib/levels";
import { DEFAULT_METHODOLOGY, isMethodologyId, METHODOLOGY_LIST } from "@/lib/methodologies";
import type { InterviewState, LevelId, MethodologyId } from "@/lib/types";

function HomeContent() {
  const router = useRouter();
  // Optional ?level=&framework= deep-link pre-selects the choosers, so a "Practice
  // again" CTA from a finished interview lands here with the same slice ready to go.
  // Unknown/absent values fall back to the defaults (validated like /history filters).
  const params = useSearchParams();
  const initLevel: LevelId = isLevelId(params.get("level")) ? (params.get("level") as LevelId) : DEFAULT_LEVEL;
  const initMethodology: MethodologyId = isMethodologyId(params.get("framework"))
    ? (params.get("framework") as MethodologyId)
    : DEFAULT_METHODOLOGY;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methodology, setMethodology] = useState<MethodologyId>(initMethodology);
  const [level, setLevel] = useState<LevelId>(initLevel);
  // null = still checking; the Start button stays disabled until we confirm a key is set.
  const [llmReady, setLlmReady] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/provider")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => alive && setLlmReady(Boolean(d?.enabled)))
      .catch(() => alive && setLlmReady(false));
    return () => {
      alive = false;
    };
  }, []);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodology, level }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Could not start the interview");
      }
      const state = (await res.json()) as InterviewState;
      router.push(`/interview/${state.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="deck-card w-full max-w-xl p-8">
        <div className="mx-auto mb-6 grid h-44 w-32 rotate-[-4deg] place-items-center rounded-2xl border border-edge bg-gradient-to-br from-accent/40 to-accent2/20 p-4 shadow-2xl">
          <span className="text-5xl">🎴</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Behavioral Interview, gamified</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Draw a random card. Answer out loud — we listen. Claude plays the interviewer: it probes with real
          follow-ups, then after 5 questions delivers a full feedback report on what was strong and what to improve.
        </p>

        {/* methodology chooser */}
        <div className="mt-7 text-left">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Pick your answer framework
          </h2>
          <RadioGroup
            ariaLabel="Pick your answer framework"
            orientation="vertical"
            className="grid gap-2"
            value={methodology}
            onChange={setMethodology}
            options={METHODOLOGY_LIST.map((m) => {
              const selected = m.id === methodology;
              return {
                id: m.id,
                ariaLabel: `${m.name} — ${m.expansion}. ${m.blurb}`,
                className: `flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  selected
                    ? "border-accent bg-accent/15 ring-1 ring-accent"
                    : "border-edge bg-surface hover:bg-surface-2"
                }`,
                content: (
                  <>
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        selected ? "border-accent bg-accent text-white" : "border-edge-strong"
                      }`}
                    >
                      {selected && <span className="text-[11px] leading-none">✓</span>}
                    </span>
                    <span>
                      <span className="flex items-baseline gap-2">
                        <span className="font-bold">{m.name}</span>
                        <span className="text-xs text-muted">{m.expansion}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{m.blurb}</span>
                    </span>
                  </>
                ),
              };
            })}
          />
        </div>

        {/* level chooser — the BAR; sibling to the framework block above */}
        <div className="mt-7 text-left">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Target level</h2>
          <RadioGroup
            ariaLabel="Target level"
            orientation="horizontal"
            className="grid grid-cols-5 gap-2"
            value={level}
            onChange={setLevel}
            options={LEVEL_LIST.map((l) => {
              const selected = l.id === level;
              return {
                id: l.id,
                ariaLabel: `${l.title} — ${l.scopeBlurb}`,
                title: `${l.title} — ${l.scopeBlurb}`,
                content: l.shortLabel,
                className: `rounded-xl border px-2 py-2.5 text-center text-sm font-bold transition ${
                  selected
                    ? "border-accent bg-accent/15 ring-1 ring-accent"
                    : "border-edge bg-surface hover:bg-surface-2"
                }`,
              };
            })}
          />
          {(() => {
            const sel = LEVEL_LIST.find((l) => l.id === level)!;
            return (
              <div className="mt-2 text-xs text-muted">
                <span className="font-semibold text-muted">{sel.name}</span> — {sel.scopeBlurb}
              </div>
            );
          })()}
        </div>

        <ul className="mx-auto mt-6 grid max-w-sm gap-2 text-left text-sm text-muted">
          <li>🎤 Speech-to-text — answer by talking</li>
          <li>🔊 Text-to-speech — the interviewer reads questions aloud</li>
          <li>🧠 Adaptive follow-ups based on your actual answer</li>
          <li>📋 Saved transcript + scored feedback at the end</li>
        </ul>

        {llmReady === false && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-left text-sm text-amber-200"
          >
            No LLM API key is configured, so interviews are disabled. Set{" "}
            <code className="rounded bg-black/30 px-1">ANTHROPIC_API_KEY</code> or{" "}
            <code className="rounded bg-black/30 px-1">GEMINI_API_KEY</code> in your{" "}
            <code className="rounded bg-black/30 px-1">.env</code> file, then reload.
          </div>
        )}

        <button
          className="btn-primary mt-8 w-full text-base"
          onClick={start}
          disabled={loading || llmReady !== true}
        >
          {loading ? "Dealing your cards…" : llmReady === null ? "Checking setup…" : "Start interview"}
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      <p className="max-w-md text-xs text-subtle">
        Tip: voice features use your browser&apos;s built-in Web Speech API (best in Chrome / Edge). You can always
        type instead.
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
