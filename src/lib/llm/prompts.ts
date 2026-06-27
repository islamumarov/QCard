// Provider-agnostic prompt text, JSON schemas, transcript rendering, and the
// offline fallbacks shared by every LLM backend.
import { expectationsBlock, type Level } from "../levels";
import { componentList, stepsBlock, type Methodology } from "../methodologies";
import type { Feedback, MessageRow } from "../types";

export const MAX_FOLLOWUPS = Number(process.env.QCARD_MAX_FOLLOWUPS || 2);

// Longest focus string we weave into a prompt — keeps a pasted advice item from
// ballooning the system prompt. Empty/whitespace-only focus is treated as none.
export const MAX_FOCUS_LEN = 280;

// Normalize a candidate-supplied focus: trim, collapse to null when empty, and
// cap the length so it can't bloat the prompt. Shared by the API + prompt layers.
export function normalizeFocus(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_FOCUS_LEN);
}

// The interviewer's system prompt, specialized to the chosen answer framework
// (the STRUCTURE) and the target SWE level (the BAR), optionally biased toward a
// gap the candidate chose to drill this run (the FOCUS).
export function interviewerSystem(m: Methodology, lvl: Level, focus: string | null = null): string {
  const focusBlock = focus
    ? `\n\nThis candidate is deliberately practising a specific weakness this run:
"${focus}"
Lean your probing toward that gap — favour follow-ups that pull on it — while still covering the question and the ${lvl.shortLabel} bar. Do not announce that you are focusing on it.`
    : "";
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
- Never break character, never mention the level or framework by name unless it feels natural, never mention that you are an AI or that this is structured output.${focusBlock}`;
}

// The feedback coach's system prompt, specialized to the framework (STRUCTURE)
// and the target SWE level (the BAR), optionally aware that the candidate was
// deliberately drilling a gap this run (the FOCUS).
export function feedbackSystem(m: Methodology, lvl: Level, focus: string | null = null): string {
  const focusBlock = focus
    ? `\n\nThe candidate ran this interview to deliberately work on a specific weakness:
"${focus}"
In your feedback, call out directly whether they improved on that gap this time, and make at least one "advice" item a concrete next step on it.`
    : "";
  return `You are an expert interview coach. The candidate answered using the ${m.name} framework (${m.expansion}) and is being evaluated against the bar for ${lvl.title}.${focusBlock}
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
In the "advice" field, give actionable "how to fix what went wrong" coaching: for each weak point you named, write one concrete next step the candidate can take — a specific drill, a rephrased version of what they should have said, or a ${m.name} component to rehearse. Make each advice item directly usable, not generic ("Re-tell your migration story leading with the metric: 'I cut p99 latency 40%…'", not "quantify your impact").
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
    advice: {
      type: "array",
      items: { type: "string" },
      description: "3-5 concrete, actionable next steps that fix the weak points — a drill, a rephrased answer, or a component to rehearse.",
    },
    overall: { type: "string", description: "A short overall summary paragraph." },
    rating: { type: "integer", description: "Overall performance 1-10." },
  },
  required: ["strengths", "improvements", "expectations", "advice", "overall", "rating"],
  additionalProperties: false,
} as const;

// The coach's system prompt for comparing two of the same candidate's
// interviews (older → newer) and calling out concrete progress.
export function comparisonSystem(): string {
  return `You are an expert interview coach reviewing a single candidate's PROGRESS across two of their own behavioral interviews.
You are given two structured feedback reports — an EARLIER session and a LATER session — plus the level/framework and a few numeric stats for each.
Your job is to tell the candidate, specifically and honestly, how they changed between the two attempts.

- "improved": concrete things that got BETTER in the later session vs the earlier one (skills, structure, depth, ownership, pacing, fewer skips). Reference what actually changed.
- "regressed": things that SLIPPED in the later session, or strengths from the earlier one that disappeared. If nothing clearly regressed, return an empty array — do not invent problems.
- "focus": the 2-3 highest-leverage things to work on next, building on the trend you see.
- "summary": one short paragraph, encouraging but candid, naming the overall direction of travel.

Compare like-for-like where you can; if the two sessions used different levels or frameworks, account for that. Be specific and reference the actual content of both reports, not generic advice.`;
}

export const COMPARISON_JSON_SCHEMA = {
  type: "object",
  properties: {
    improved: { type: "array", items: { type: "string" }, description: "What got better in the later session." },
    regressed: { type: "array", items: { type: "string" }, description: "What slipped; empty array if nothing clearly did." },
    focus: { type: "array", items: { type: "string" }, description: "2-3 highest-leverage next focus areas." },
    summary: { type: "string", description: "One short overall progress paragraph." },
  },
  required: ["improved", "regressed", "focus", "summary"],
  additionalProperties: false,
} as const;

// One side of a comparison, as fed to the model. Kept structural (no import of
// lib/compare) so the prompt layer stays free of a dependency cycle.
interface ComparisonSide {
  label: string; // "EARLIER" | "LATER"
  level: string;
  methodology: string;
  rating: number | null;
  totalSeconds: number | null;
  questionCount: number;
  skipped: number;
  feedback: Feedback | null;
}

function renderComparisonSide(side: ComparisonSide): string {
  const fb = side.feedback;
  const lines = [
    `## ${side.label} session`,
    `Level: ${side.level} · Framework: ${side.methodology}`,
    `Rating: ${side.rating ?? "n/a"}/10 · Questions: ${side.questionCount} · Skipped: ${side.skipped} · Total time: ${
      side.totalSeconds != null ? `${Math.round(side.totalSeconds / 60)} min` : "n/a"
    }`,
  ];
  if (fb) {
    if (fb.strengths.length) lines.push(`Strengths:\n${fb.strengths.map((s) => `- ${s}`).join("\n")}`);
    if (fb.improvements.length) lines.push(`To improve:\n${fb.improvements.map((s) => `- ${s}`).join("\n")}`);
    if (fb.overall) lines.push(`Overall: ${fb.overall}`);
  }
  return lines.join("\n");
}

export function renderComparisonInput(older: ComparisonSide, newer: ComparisonSide): string {
  return `${renderComparisonSide(older)}\n\n${renderComparisonSide(newer)}\n\nCompare the LATER session against the EARLIER one and produce the structured progress report.`;
}

export function fallbackComparison(ratingDelta: number | null) {
  const dir =
    ratingDelta == null
      ? "We can't tell the direction without AI analysis"
      : ratingDelta > 0
        ? `Your rating went up ${ratingDelta} point${ratingDelta === 1 ? "" : "s"}`
        : ratingDelta < 0
          ? `Your rating dropped ${Math.abs(ratingDelta)} point${Math.abs(ratingDelta) === 1 ? "" : "s"}`
          : "Your rating held steady";
  return {
    improved: ["Set an LLM API key for AI-written, transcript-specific progress notes."],
    regressed: [],
    focus: [
      "Re-run both interviews' weak points and compare your structure side by side.",
      "Quantify impact and clarify personal ownership in every story.",
    ],
    summary: `${dir}. (Offline fallback — set ANTHROPIC_API_KEY or GEMINI_API_KEY for AI-generated, side-by-side progress analysis.)`,
  };
}

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
    advice: [
      `Re-tell one story leading with the result: open with the metric or outcome, then back-fill the ${m.name} steps that got you there.`,
      "Rehearse swapping 'we' for 'I' on your weakest answer — say out loud the one decision you personally owned.",
      `Pick the question you found hardest and drill it twice against the ${lvl.shortLabel} bar (${lvl.expectationBar}).`,
    ],
    overall: `A solid practice run, evaluated against the ${lvl.shortLabel} bar. (Offline fallback feedback — set the ${provider} API key for AI-generated, transcript-specific analysis.)`,
    rating: 6,
  };
}
