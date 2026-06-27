import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateJSONOpts, JsonLLM, SchemaKey } from "./types";

// Gemini uses its own responseSchema dialect (uppercase Type enum), so the
// schemas are declared here rather than reusing the JSON-Schema versions.
const GEMINI_SCHEMAS: Record<SchemaKey, object> = {
  analysis: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ["followup", "next"] },
      message: { type: Type.STRING, description: "The interviewer's next spoken line to the candidate." },
    },
    required: ["action", "message"],
    propertyOrdering: ["action", "message"],
  },
  feedback: {
    type: Type.OBJECT,
    properties: {
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
      expectations: { type: Type.ARRAY, items: { type: Type.STRING } },
      overall: { type: Type.STRING },
      rating: { type: Type.INTEGER },
    },
    required: ["strengths", "improvements", "expectations", "overall", "rating"],
    propertyOrdering: ["strengths", "improvements", "expectations", "overall", "rating"],
  },
  comparison: {
    type: Type.OBJECT,
    properties: {
      improved: { type: Type.ARRAY, items: { type: Type.STRING } },
      regressed: { type: Type.ARRAY, items: { type: Type.STRING } },
      focus: { type: Type.ARRAY, items: { type: Type.STRING } },
      summary: { type: Type.STRING },
    },
    required: ["improved", "regressed", "focus", "summary"],
    propertyOrdering: ["improved", "regressed", "focus", "summary"],
  },
};

export function createGeminiProvider(): JsonLLM {
  const model = process.env.QCARD_GEMINI_MODEL || "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // "flash" tiers let us turn thinking off for fast, deterministic JSON.
  // "pro" requires a thinking budget, so leave it on (default dynamic).
  const isFlash = /flash/i.test(model);

  return {
    id: "gemini",
    model,
    enabled: Boolean(client),
    async generateJSON({ system, user, schema, maxTokens }: GenerateJSONOpts) {
      if (!client) throw new Error("GEMINI_API_KEY not set");
      const res = await client.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: GEMINI_SCHEMAS[schema],
          // Thinking tokens count toward the output budget on 2.5 models —
          // give headroom, and disable thinking on flash to protect the budget.
          maxOutputTokens: Math.max(maxTokens, 2048),
          ...(isFlash ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      });
      const text = res.text;
      if (!text) throw new Error("Gemini returned no text");
      return JSON.parse(text);
    },
  };
}
