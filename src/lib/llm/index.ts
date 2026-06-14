// LLM facade: selects the configured provider (Anthropic or Gemini) and exposes
// the two interview operations. Prompt building, the follow-up cap, fallbacks,
// and result normalization live here so they are identical across providers.
import { getLevel } from "../levels";
import { getMethodology } from "../methodologies";
import type { AnswerAnalysis, Feedback, LevelId, MessageRow, MethodologyId } from "../types";
import { createAnthropicProvider } from "./anthropic";
import { createGeminiProvider } from "./gemini";
import {
  MAX_FOLLOWUPS,
  fallbackBridge,
  fallbackFeedback,
  fallbackFollowup,
  feedbackSystem,
  interviewerSystem,
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
    return parsed;
  } catch (err) {
    console.error(`[${provider.id}] generateFeedback failed`, err);
    return fallbackFeedback(providerName, m, lvl);
  }
}
