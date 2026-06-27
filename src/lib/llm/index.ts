// LLM facade: selects the configured provider (Anthropic or Gemini) and exposes
// the two interview operations. Prompt building, the follow-up cap, fallbacks,
// and result normalization live here so they are identical across providers.
import { getLevel } from "../levels";
import { getMethodology } from "../methodologies";
import type { CompareSide } from "../compare";
import type { AnswerAnalysis, Comparison, Feedback, LevelId, MessageRow, MethodologyId } from "../types";
import { createAnthropicProvider } from "./anthropic";
import { createGeminiProvider } from "./gemini";
import {
  MAX_FOLLOWUPS,
  comparisonSystem,
  fallbackBridge,
  fallbackComparison,
  fallbackFeedback,
  fallbackFollowup,
  feedbackSystem,
  interviewerSystem,
  renderComparisonInput,
  renderFullTranscript,
  renderQuestionTranscript,
} from "./prompts";
import type { AnalyzeParams, JsonLLM, ProviderId } from "./types";

export { MAX_FOLLOWUPS };
export type { AnalyzeParams };

function resolveProvider(): JsonLLM {
  const choice = (process.env.QCARD_PROVIDER || "anthropic").toLowerCase() as ProviderId;
  switch (choice) {
    case "gemini":
      return createGeminiProvider();
    case "anthropic":
      return createAnthropicProvider();
    default:
      console.warn(`Unknown QCARD_PROVIDER "${choice}" — falling back to anthropic`);
      return createAnthropicProvider();
  }
}

// Memoize across dev hot reloads.
const globalForLlm = globalThis as unknown as { __qcardProvider?: JsonLLM };
export function getProvider(): JsonLLM {
  if (!globalForLlm.__qcardProvider) globalForLlm.__qcardProvider = resolveProvider();
  return globalForLlm.__qcardProvider;
}

export const activeProvider = (): { id: ProviderId; model: string; enabled: boolean } => {
  const p = getProvider();
  return { id: p.id, model: p.model, enabled: p.enabled };
};

export const llmEnabled = (): boolean => getProvider().enabled;

// ---- analyze a candidate answer -> follow-up or move on ----

export async function analyzeAnswer({ questionMessages, followupsAsked, isLastMain, methodology, level }: AnalyzeParams): Promise<AnswerAnalysis> {
  const provider = getProvider();
  const reachedLimit = followupsAsked >= MAX_FOLLOWUPS;

  if (!provider.enabled) {
    return reachedLimit
      ? { action: "next", message: fallbackBridge(isLastMain) }
      : { action: "followup", message: fallbackFollowup() };
  }

  const transcript = renderQuestionTranscript(questionMessages);
  const guidance = reachedLimit
    ? `You have already asked ${followupsAsked} follow-up(s) on this question (the maximum). You MUST choose action "next" and give a brief acknowledgement.`
    : `You may ask at most one more follow-up on this question (asked so far: ${followupsAsked} of ${MAX_FOLLOWUPS}). Decide whether one more probe is warranted, otherwise choose "next".`;

  const user = `Here is the conversation for the current main question so far:\n\n${transcript}\n\n${guidance}\n\nDecide the next move and write your single spoken line.`;

  try {
    const parsed = (await provider.generateJSON({
      system: interviewerSystem(getMethodology(methodology), getLevel(level)),
      user,
      schema: "analysis",
      maxTokens: 2048,
    })) as AnswerAnalysis;

    if (reachedLimit) parsed.action = "next";
    if (parsed.action !== "followup" && parsed.action !== "next") parsed.action = "next";
    if (!parsed.message) parsed.message = fallbackBridge(isLastMain);
    return parsed;
  } catch (err) {
    console.error(`[${provider.id}] analyzeAnswer failed`, err);
    return { action: "next", message: fallbackBridge(isLastMain) };
  }
}

// ---- final feedback over the whole interview ----

export async function generateFeedback(
  allMessages: MessageRow[],
  methodology: MethodologyId,
  level: LevelId,
): Promise<Feedback> {
  const provider = getProvider();
  const m = getMethodology(methodology);
  const lvl = getLevel(level);
  const providerName = provider.id === "gemini" ? "GEMINI" : "ANTHROPIC";
  if (!provider.enabled) return fallbackFeedback(providerName, m, lvl);

  const transcript = renderFullTranscript(allMessages);

  try {
    const parsed = (await provider.generateJSON({
      system: feedbackSystem(m, lvl),
      user: `Full interview transcript:\n\n${transcript}\n\nProduce the structured feedback.`,
      schema: "feedback",
      maxTokens: 3072,
    })) as Feedback;

    if (typeof parsed.rating !== "number") parsed.rating = 6;
    parsed.rating = Math.max(1, Math.min(10, Math.round(parsed.rating)));
    if (!Array.isArray(parsed.advice)) parsed.advice = undefined;
    return parsed;
  } catch (err) {
    console.error(`[${provider.id}] generateFeedback failed`, err);
    return fallbackFeedback(providerName, m, lvl);
  }
}

// ---- progress diff across two of the candidate's interviews (older -> newer) ----

export async function generateComparison(older: CompareSide, newer: CompareSide): Promise<Comparison> {
  const provider = getProvider();
  const ratingDelta = older.rating != null && newer.rating != null ? newer.rating - older.rating : null;
  if (!provider.enabled) return fallbackComparison(ratingDelta);

  const toSide = (label: string, s: CompareSide) => ({
    label,
    level: s.level,
    methodology: s.methodology,
    rating: s.rating,
    totalSeconds: s.totalSeconds,
    questionCount: s.questionCount,
    skipped: s.skipped,
    feedback: s.feedback,
  });

  try {
    const parsed = (await provider.generateJSON({
      system: comparisonSystem(),
      user: renderComparisonInput(toSide("EARLIER", older), toSide("LATER", newer)),
      schema: "comparison",
      maxTokens: 2048,
    })) as Comparison;

    for (const k of ["improved", "regressed", "focus"] as const) {
      if (!Array.isArray(parsed[k])) parsed[k] = [];
    }
    if (typeof parsed.summary !== "string") parsed.summary = "";
    return parsed;
  } catch (err) {
    console.error(`[${provider.id}] generateComparison failed`, err);
    return fallbackComparison(ratingDelta);
  }
}
