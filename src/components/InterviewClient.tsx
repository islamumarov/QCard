"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FeedbackReport from "@/components/FeedbackReport";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";
import type { InterviewState, Turn } from "@/lib/types";

export default function InterviewClient({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<InterviewState | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenId = useRef<number>(-1);
  const feedbackRequested = useRef(false);

  // ---- load initial state ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) throw new Error("Session not found");
        const data = (await res.json()) as InterviewState;
        if (alive) setState(data);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  // ---- keep textarea in sync with live speech transcript ----
  useEffect(() => {
    if (stt.listening) setAnswer(stt.transcript);
  }, [stt.transcript, stt.listening]);

  // ---- auto-scroll transcript ----
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state?.transcript.length]);

  // ---- speak the newest interviewer line ----
  useEffect(() => {
    if (!state || !autoSpeak || !tts.supported) return;
    const lastInterviewer = [...state.transcript].reverse().find((t) => t.role === "interviewer");
    if (lastInterviewer && lastInterviewer.id !== lastSpokenId.current) {
      lastSpokenId.current = lastInterviewer.id;
      tts.speak(lastInterviewer.content);
    }
  }, [state, autoSpeak, tts]);

  // ---- request feedback once the last question is answered ----
  useEffect(() => {
    if (!state || state.awaiting !== "feedback" || feedbackRequested.current) return;
    feedbackRequested.current = true;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json()) as InterviewState;
        setState(data);
      } catch {
        setError("Failed to generate feedback");
        feedbackRequested.current = false;
      } finally {
        setBusy(false);
      }
    })();
  }, [state, sessionId]);

  const submitAnswer = useCallback(async () => {
    const content = answer.trim();
    if (!content || busy) return;
    if (stt.listening) stt.stop();
    tts.cancel();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit answer");
      }
      const data = (await res.json()) as InterviewState;
      setState(data);
      setAnswer("");
      stt.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }, [answer, busy, sessionId, stt, tts]);

  function toggleMic() {
    if (stt.listening) {
      stt.stop();
    } else {
      tts.cancel();
      if (!answer) stt.reset();
      stt.start();
    }
  }

  if (error && !state) {
    return (
      <div className="deck-card p-6 text-center">
        <p className="text-red-400">{error}</p>
        <a href="/" className="btn-ghost mt-4">
          Back home
        </a>
      </div>
    );
  }
  if (!state) {
    return <div className="deck-card animate-pulse p-6 text-center text-slate-400">Loading interview…</div>;
  }

  const finished = state.awaiting === "done";
  const generatingFeedback = state.awaiting === "feedback";
  const answered = Math.min(state.currentMainIndex, state.mainQuestionCount);

  const providerLabel =
    state.provider.id === "gemini" ? "Google Gemini" : "Anthropic Claude";

  return (
    <div className="flex flex-col gap-5">
      {/* level + framework + active provider */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="chip border-accent/30 bg-accent/10" title={state.level.scopeBlurb}>
          🎯 {state.level.name}
        </span>
        <span
          className="chip border-accent2/30 bg-accent2/10"
          title={`Answering with the ${state.methodology.name} framework: ${state.methodology.expansion}`}
        >
          🧩 {state.methodology.name} · {state.methodology.steps.join(" → ")}
        </span>
        <span className="chip" title={state.provider.enabled ? "AI provider in use" : "No API key — using offline fallbacks"}>
          {state.provider.enabled ? "🤖" : "💤"} {providerLabel} · {state.provider.model}
          {!state.provider.enabled && " (offline)"}
        </span>
      </div>

      {/* progress */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
          <span>
            Question {Math.min(state.currentMainIndex + (finished || generatingFeedback ? 0 : 1), state.mainQuestionCount)} of{" "}
            {state.mainQuestionCount}
          </span>
          {tts.supported && (
            <div className="flex items-center gap-3">
              {tts.voices.length > 0 && (
                <select
                  className="max-w-[10rem] truncate rounded-lg border border-white/10 bg-ink/60 px-2 py-1 text-xs text-slate-200 outline-none focus:border-accent"
                  value={tts.voiceURI ?? ""}
                  onChange={(e) => {
                    tts.setVoiceURI(e.target.value);
                    tts.speak("Hi, I'll be your interviewer today.");
                  }}
                  title="Choose interviewer voice"
                >
                  {tts.voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
                🔊 read aloud
              </label>
            </div>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all"
            style={{ width: `${(answered / state.mainQuestionCount) * 100}%` }}
          />
        </div>
      </div>

      {/* current card */}
      {state.currentQuestion && !finished && !generatingFeedback && (
        <div className="deck-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="chip">🎴 {state.currentQuestion.category}</span>
            {tts.supported && (
              <button
                className="btn-ghost px-3 py-1.5 text-sm"
                onClick={() => tts.speak(state.currentQuestion!.text)}
                aria-label="Read question aloud"
              >
                {tts.speaking ? "🔊 …" : "🔊 Replay"}
              </button>
            )}
          </div>
          <p className="text-lg font-medium leading-snug">{state.currentQuestion.text}</p>
        </div>
      )}

      {/* transcript */}
      <div className="deck-card max-h-[42vh] overflow-y-auto p-4">
        <div className="space-y-3">
          {state.transcript.map((t) => (
            <Bubble key={t.id} turn={t} />
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* composer / feedback */}
      {finished && state.feedback ? (
        <FeedbackReport feedback={state.feedback} />
      ) : generatingFeedback ? (
        <div className="deck-card p-6 text-center">
          <p className="animate-pulse text-slate-300">🧠 The interviewer is preparing your feedback…</p>
        </div>
      ) : (
        <div className="deck-card p-4">
          <textarea
            className="w-full resize-none rounded-xl border border-white/10 bg-ink/60 p-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-accent"
            rows={4}
            placeholder={stt.listening ? "Listening… speak your answer" : "Type your answer, or tap the mic to speak…"}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={busy}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {stt.supported ? (
                <button
                  className={`btn-ghost ${stt.listening ? "recording border-red-500/60 text-red-300" : ""}`}
                  onClick={toggleMic}
                  disabled={busy}
                >
                  {stt.listening ? "⏹ Stop" : "🎤 Speak"}
                </button>
              ) : (
                <span className="text-xs text-slate-500">Mic not supported in this browser — type instead.</span>
              )}
              {answer && (
                <button className="btn-ghost text-sm" onClick={() => { setAnswer(""); stt.reset(); }} disabled={busy}>
                  Clear
                </button>
              )}
            </div>
            <button className="btn-primary" onClick={submitAnswer} disabled={busy || !answer.trim()}>
              {busy ? "Thinking…" : "Send answer"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  const isCandidate = turn.role === "candidate";
  const labels: Record<string, string> = {
    intro: "Interviewer",
    main: "Interviewer · question",
    followup: "Interviewer",
    answer: "You",
    feedback: "Interviewer",
  };
  return (
    <div className={`flex ${isCandidate ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isCandidate
            ? "rounded-br-sm bg-accent/20 text-slate-100"
            : turn.kind === "main"
              ? "rounded-bl-sm border border-accent2/30 bg-accent2/10 text-slate-100"
              : "rounded-bl-sm bg-white/5 text-slate-200"
        }`}
      >
        <div className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-400">{labels[turn.kind]}</div>
        {turn.content}
      </div>
    </div>
  );
}
