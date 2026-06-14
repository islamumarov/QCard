"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_LEVEL, LEVEL_LIST } from "@/lib/levels";
import { DEFAULT_METHODOLOGY, METHODOLOGY_LIST } from "@/lib/methodologies";
import type { InterviewState, LevelId, MethodologyId } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methodology, setMethodology] = useState<MethodologyId>(DEFAULT_METHODOLOGY);
  const [level, setLevel] = useState<LevelId>(DEFAULT_LEVEL);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodology, level }),
      });
      if (!res.ok) throw new Error("Could not start the interview");
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
        <div className="mx-auto mb-6 grid h-44 w-32 rotate-[-4deg] place-items-center rounded-2xl border border-white/15 bg-gradient-to-br from-accent/40 to-accent2/20 p-4 shadow-2xl">
          <span className="text-5xl">🎴</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Behavioral Interview, gamified</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-300">
          Draw a random card. Answer out loud — we listen. Claude plays the interviewer: it probes with real
          follow-ups, then after 5 questions delivers a full feedback report on what was strong and what to improve.
        </p>

        {/* methodology chooser */}
        <div className="mt-7 text-left">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Pick your answer framework
          </h2>
          <div className="grid gap-2">
            {METHODOLOGY_LIST.map((m) => {
              const selected = m.id === methodology;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethodology(m.id)}
                  aria-pressed={selected}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-accent bg-accent/15 ring-1 ring-accent"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      selected ? "border-accent bg-accent text-white" : "border-white/30"
                    }`}
                  >
                    {selected && <span className="text-[11px] leading-none">✓</span>}
                  </span>
                  <span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-bold">{m.name}</span>
                      <span className="text-xs text-slate-400">{m.expansion}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">{m.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* level chooser — the BAR; sibling to the framework block above */}
        <div className="mt-7 text-left">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Target level</h2>
          <div className="grid grid-cols-5 gap-2">
            {LEVEL_LIST.map((l) => {
              const selected = l.id === level;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLevel(l.id)}
                  aria-pressed={selected}
                  aria-label={`${l.title} — ${l.scopeBlurb}`}
                  title={`${l.title} — ${l.scopeBlurb}`}
                  className={`rounded-xl border px-2 py-2.5 text-center text-sm font-bold transition ${
                    selected
                      ? "border-accent bg-accent/15 ring-1 ring-accent"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {l.shortLabel}
                </button>
              );
            })}
          </div>
          {(() => {
            const sel = LEVEL_LIST.find((l) => l.id === level)!;
            return (
              <div className="mt-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">{sel.name}</span> — {sel.scopeBlurb}
              </div>
            );
          })()}
        </div>

        <ul className="mx-auto mt-6 grid max-w-sm gap-2 text-left text-sm text-slate-300">
          <li>🎤 Speech-to-text — answer by talking</li>
          <li>🔊 Text-to-speech — the interviewer reads questions aloud</li>
          <li>🧠 Adaptive follow-ups based on your actual answer</li>
          <li>📋 Saved transcript + scored feedback at the end</li>
        </ul>

        <button className="btn-primary mt-8 w-full text-base" onClick={start} disabled={loading}>
          {loading ? "Dealing your cards…" : "Start interview"}
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      <p className="max-w-md text-xs text-slate-500">
        Tip: voice features use your browser&apos;s built-in Web Speech API (best in Chrome / Edge). You can always
        type instead.
      </p>
    </div>
  );
}
