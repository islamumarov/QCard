import type { LevelId, MessageRow, MethodologyId } from "../types";

export type ProviderId = "anthropic" | "gemini";
export type SchemaKey = "analysis" | "feedback" | "comparison";

export interface GenerateJSONOpts {
  system: string;
  user: string;
  schema: SchemaKey;
  maxTokens: number;
}

// A backend that can return a schema-constrained JSON object.
export interface JsonLLM {
  id: ProviderId;
  model: string;
  enabled: boolean; // false when no API key is configured
  generateJSON(opts: GenerateJSONOpts): Promise<unknown>;
}

export interface AnalyzeParams {
  questionMessages: MessageRow[]; // card + answers + prior follow-ups for the current main question
  followupsAsked: number;
  isLastMain: boolean; // if true and we move on, the interview ends after this
  methodology: MethodologyId; // the answer framework chosen for this session
  level: LevelId; // the target SWE level (the bar)
  focus?: string | null; // optional gap the candidate is drilling this run
}
