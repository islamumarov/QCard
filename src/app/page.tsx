"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InterviewState } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/session", { method: "POST" });
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
