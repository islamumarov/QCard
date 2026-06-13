"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// --- Minimal typings for the Web Speech API (not in TS lib.dom by default) ---
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// ---- Speech-to-text -------------------------------------------------------

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interimChunk = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if (finalChunk) setFinalText((prev) => (prev ? prev + " " : "") + finalChunk.trim());
      setInterim(interimChunk);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recRef.current = rec;
    return () => rec.abort();
  }, []);

  const start = useCallback(() => {
    if (!recRef.current || listening) return;
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }, [listening]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setFinalText("");
    setInterim("");
  }, []);

  // Convenience: what the textarea should show while recording.
  const transcript = (finalText + (interim ? " " + interim : "")).trim();

  return { supported, listening, transcript, finalText, interim, start, stop, reset, setFinalText };
}

// ---- Text-to-speech -------------------------------------------------------

const VOICE_STORAGE_KEY = "qcard.voiceURI";

// Novelty / low-quality system voices to avoid (macOS ships many).
const BAD_VOICE =
  /compact|eloquence|albert|bad news|good news|bells|bahh|boing|bubbles|cellos|deranged|hysterical|pipe|trinoids|whisper|wobble|zarvox|jester|organ|superstar|novelty|grandma|grandpa|reed|rocko|sandy|shelley|flo|eddy/i;

// Names that signal a high-quality / neural voice.
const GOOD_VOICE = [
  /natural/i, // Microsoft "… Online (Natural)", Chrome neural
  /google/i, // Chrome's Google voices
  /premium/i,
  /enhanced/i,
  /siri/i,
  /samantha/i,
  /ava/i,
  /allison/i,
  /serena/i,
  /\bjenny\b|\baria\b|\bguy\b/i, // Edge neural voices
];

function scoreVoice(v: SpeechSynthesisVoice): number {
  if (!/^en/i.test(v.lang)) return -1000; // English only for this app
  let s = 0;
  GOOD_VOICE.forEach((re, i) => {
    if (re.test(v.name)) s += (GOOD_VOICE.length - i) * 10;
  });
  if (BAD_VOICE.test(v.name)) s -= 60;
  if (v.localService === false) s += 8; // cloud/neural voices tend to sound better
  if (/en[-_]US/i.test(v.lang)) s += 4;
  if (v.default) s += 1;
  return s;
}

function pickBest(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => /^en/i.test(v.lang));
  if (!en.length) return voices[0] ?? null;
  return [...en].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState<string | null>(null);

  // Load voices (async — populated after the `voiceschanged` event fires).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const synth = window.speechSynthesis;

    const load = () => {
      const list = synth.getVoices().filter((v) => /^en/i.test(v.lang));
      if (!list.length) return;
      setVoices(list);
      setVoiceURIState((prev) => {
        if (prev && list.some((v) => v.voiceURI === prev)) return prev;
        const saved = window.localStorage.getItem(VOICE_STORAGE_KEY);
        if (saved && list.some((v) => v.voiceURI === saved)) return saved;
        return pickBest(list)?.voiceURI ?? null;
      });
    };

    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  const setVoiceURI = useCallback((uri: string) => {
    setVoiceURIState(uri);
    if (typeof window !== "undefined") window.localStorage.setItem(VOICE_STORAGE_KEY, uri);
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
      const synth = window.speechSynthesis;
      synth.cancel(); // stop anything in flight

      const u = new SpeechSynthesisUtterance(text);
      const all = synth.getVoices();
      const chosen = (voiceURI && all.find((v) => v.voiceURI === voiceURI)) || pickBest(all);
      if (chosen) {
        u.voice = chosen;
        u.lang = chosen.lang;
      } else {
        u.lang = "en-US";
      }
      // Slightly slower + natural pitch reads less robotic for interview prompts.
      u.rate = 0.95;
      u.pitch = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    },
    [voiceURI],
  );

  return { supported, speaking, voices, voiceURI, setVoiceURI, speak, cancel };
}
