import Anthropic from "@anthropic-ai/sdk";
import { ANALYSIS_JSON_SCHEMA, FEEDBACK_JSON_SCHEMA } from "./prompts";
import type { GenerateJSONOpts, JsonLLM, SchemaKey } from "./types";

const SCHEMAS: Record<SchemaKey, Record<string, unknown>> = {
  analysis: ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown>,
  feedback: FEEDBACK_JSON_SCHEMA as unknown as Record<string, unknown>,
};

function firstText(message: Anthropic.Message): string {
  for (const block of message.content) if (block.type === "text") return block.text;
  return "";
}

export function createAnthropicProvider(): JsonLLM {
  const model = process.env.QCARD_ANTHROPIC_MODEL || process.env.QCARD_MODEL || "claude-opus-4-8";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const client = apiKey ? new Anthropic({ apiKey }) : null;

  return {
    id: "anthropic",
    model,
    enabled: Boolean(client),
    async generateJSON({ system, user, schema, maxTokens }: GenerateJSONOpts) {
      if (!client) throw new Error("ANTHROPIC_API_KEY not set");
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        thinking: { type: "adaptive" },
        system,
        output_config: { format: { type: "json_schema", schema: SCHEMAS[schema] } },
        messages: [{ role: "user", content: user }],
      });
      return JSON.parse(firstText(res));
    },
  };
}
