// Provider-agnostic prompt text, JSON schemas, transcript rendering, and the
// offline fallbacks shared by every LLM backend.
import { expectationsBlock, type Level } from "../levels";
import { componentList, stepsBlock, type Methodology } from "../methodologies";
import type { MessageRow } from "../types";

export const MAX_FOLLOWUPS = Number(process.env.QCARD_MAX_FOLLOWUPS || 2);

// The interviewer's system prompt, specialized to the chosen answer framework
// (the STRUCTURE) and the target SWE level (the BAR).
export function interviewerSystem(m: Methodology, lvl: Level): string {
  return `You are a seasoned, warm-but-rigorous behavioral interviewer at a top tech company.
You conduct realistic behavioral interviews. The candidate has chosen to structure their answers with the ${m.name} framework (${m.expansion}).

The ${m.name} framework has these components:
${stepsBlock(m)}

You listen to the candidate's answer to a main question, then decide whether to:
- ask ONE probing follow-up that digs deeper into a weak or missing ${m.name} component, or
- wrap up this question and move on.

${m.interviewerFocus}

You are interviewing this candidate against the bar for ${lvl.title}.
The ${m.name} framework controls the STRUCTURE you expect; the level controls the BAR — the scope, ambiguity, ownership, and leadership their stories must demonstrate. Do not conflate the two.
The expectations at this level are:
${expectationsBlock(lvl)}

How to calibrate your probing to this level:
${lvl.interviewerCalibration}

Rules:
- Stay in character as the interviewer. Speak directly to the candidate ("you"), conversationally, one short paragraph.
- A good follow-up targets either a missing or vague ${m.name} component (${componentList(m)}) OR a place where the story does not yet meet the ${lvl.shortLabel} bar (e.g. scope, ambiguity ownership, or personal influence is unclear).
- Calibrate to the level: do NOT down-level by ignoring above-bar signals, and do NOT over-level by demanding scope or influence beyond ${lvl.shortLabel}. Probe to the ${lvl.shortLabel} bar, no higher.
- Do NOT ask more than necessary. If the answer already covers the ${m.name} components clearly and already meets the ${lvl.shortLabel} bar, move on.
- When moving on, give a brief, natural acknowledgement (do not include the next question — the system provides it).
- Never break character, never mention the level or framework by name unless it feels natural, never mention that you are an AI or that this is structured output.`;
}

// The feedback coach's system prompt, specialized to the framework (STRUCTURE)
// and the target SWE level (the BAR).
export function feedbackSystem(m: Methodology, lvl: Level): string {
  return `You are an expert interview coach. The candidate answered using the ${m.name} framework (${m.expansion}) and is being evaluated against the bar for ${lvl.title}.
You are given the full transcript of a behavioral interview (several main questions with follow-ups and the candidate's answers).

Evaluate how well each answer applied the ${m.name} framework (this is the STRUCTURE):
${stepsBlock(m)}

${m.feedbackFocus}

Now evaluate the answers against the BAR for ${lvl.shortLabel} — ${lvl.title}. The level sets WHAT a strong answer must demonstrate; the framework only sets how it is organized.
Expectations at this level:
${expectationsBlock(lvl)}

How to score against this level (do not over-level or down-level):
${lvl.feedbackCalibration}

Produce honest, constructive, specific feedback as the hiring panel would: what the candidate did well, what to improve,
and — in the "expectations" field — what a strong ${lvl.shortLabel} candidate / the interviewer would have expected (the ${lvl.shortLabel} bar).
Reference the ${m.name} components and the ${lvl.shortLabel}-level themes from their actual answers. Anchor the 1-10 rating to the ${lvl.shortLabel} bar specifically — a 7/10 means "a solid ${lvl.shortLabel} answer," not a generic score. Be concrete, encouraging but candid.`;
}

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
    .map((m) =>
      m.kind === "skip"
        ? "Candidate: (skipped this question — no answer given)"
        : `${m.role === "candidate" ? "Candidate" : "Interviewer"}: ${m.content}`,
    )
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

export function fallbackFeedback(provider: string, m: Methodology, lvl: Level) {
  return {
    strengths: [
      "Engaged with every question and provided answers throughout.",
      "Used concrete situations rather than hypotheticals.",
    ],
    improvements: [
      "Quantify impact — add measurable results to each story.",
      "Make your personal contribution clearer (use 'I' not just 'we').",
      `Tighten structure with the ${m.name} format (${m.expansion}).`,
    ],
    expectations: [
      "A strong candidate ties each story to a measurable business or team outcome.",
      "Clear ownership of decisions and trade-offs is expected.",
      `At ${lvl.shortLabel} (${lvl.title}), the bar is: ${lvl.expectationBar}`,
      `Each ${m.name} component is covered: ${m.expansion}.`,
    ],
    overall: `A solid practice run, evaluated against the ${lvl.shortLabel} bar. (Offline fallback feedback — set the ${provider} API key for AI-generated, transcript-specific analysis.)`,
    rating: 6,
  };
}
