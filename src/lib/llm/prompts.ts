// Provider-agnostic prompt text, JSON schemas, transcript rendering, and the
// offline fallbacks shared by every LLM backend.
import type { MessageRow } from "../types";

export const MAX_FOLLOWUPS = Number(process.env.QCARD_MAX_FOLLOWUPS || 2);

export const INTERVIEWER_SYSTEM = `You are a seasoned, warm-but-rigorous behavioral interviewer at a top tech company.
You conduct realistic behavioral interviews. You listen to the candidate's answer to a main question, then decide whether to:
- ask ONE probing follow-up that digs deeper (specifics, metrics, their personal role, trade-offs, what they learned), or
- wrap up this question and move on.

Rules:
- Stay in character as the interviewer. Speak directly to the candidate ("you"), conversationally, one short paragraph.
- A good follow-up targets a gap: vague impact, no measurable result, unclear personal contribution, or missing reflection.
- Do NOT ask more than necessary. If the answer is already complete and specific, move on.
- When moving on, give a brief, natural acknowledgement (do not include the next question — the system provides it).
- Never break character, never mention that you are an AI or that this is structured output.`;

export const FEEDBACK_SYSTEM = `You are an expert interview coach. You are given the full transcript of a behavioral interview
(several main questions with follow-ups and the candidate's answers). Produce honest, constructive, specific feedback as
the hiring panel would: what the candidate did well, what to improve, and what a strong candidate / the interviewer
would have expected. Be concrete and reference themes from their actual answers. Encouraging but candid.`;

// JSON Schema (draft-style) — used directly by providers that accept it (Anthropic).
export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["followup", "next"] },
    message: { type: "string", description: "The interviewer's next spoken line to the candidate." },
  },
  required: ["action", "message"],
  additionalProperties: false,
} as const;

export const FEEDBACK_JSON_SCHEMA = {
  type: "object",
  properties: {
    strengths: { type: "array", items: { type: "string" }, description: "3-5 specific strengths shown." },
    improvements: { type: "array", items: { type: "string" }, description: "3-5 concrete areas to improve." },
    expectations: {
      type: "array",
      items: { type: "string" },
      description: "3-5 things a strong candidate / the interviewer would have expected (the bar).",
    },
    overall: { type: "string", description: "A short overall summary paragraph." },
    rating: { type: "integer", description: "Overall performance 1-10." },
  },
  required: ["strengths", "improvements", "expectations", "overall", "rating"],
  additionalProperties: false,
} as const;

// ---- transcript rendering ----

export function renderQuestionTranscript(messages: MessageRow[]): string {
  return messages
    .map((m) => {
      const who = m.role === "candidate" ? "Candidate" : "Interviewer";
      const tag = m.kind === "main" ? " (main question)" : m.kind === "followup" ? " (follow-up)" : "";
      return `${who}${tag}: ${m.content}`;
    })
    .join("\n");
}

export function renderFullTranscript(allMessages: MessageRow[]): string {
  return allMessages
    .filter((m) => m.kind !== "intro")
    .map((m) => `${m.role === "candidate" ? "Candidate" : "Interviewer"}: ${m.content}`)
    .join("\n");
}

// ---- offline fallbacks (no provider key configured) ----

export function fallbackBridge(isLastMain: boolean): string {
  return isLastMain
    ? "Thank you — that gives me a clear picture. That's the last of my questions; let me pull together some feedback."
    : "Got it, thank you. Let's move on to the next one.";
}

export function fallbackFollowup(): string {
  return "Thanks — that's a good start. Can you go deeper on your specific role in that situation, and what the measurable outcome was?";
}

export function fallbackFeedback(provider: string) {
  return {
    strengths: [
      "Engaged with every question and provided answers throughout.",
      "Used concrete situations rather than hypotheticals.",
    ],
    improvements: [
      "Quantify impact — add measurable results to each story.",
      "Make your personal contribution clearer (use 'I' not just 'we').",
      "Tighten structure with the STAR format (Situation, Task, Action, Result).",
    ],
    expectations: [
      "A strong candidate ties each story to a measurable business or team outcome.",
      "Clear ownership of decisions and trade-offs is expected.",
      "Reflection on lessons learned and what they'd do differently.",
    ],
    overall: `A solid practice run. (Offline fallback feedback — set the ${provider} API key for AI-generated, transcript-specific analysis.)`,
    rating: 6,
  };
}
