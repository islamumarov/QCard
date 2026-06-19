import { NextResponse } from "next/server";
import { activeProvider } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/provider — report whether the LLM is usable, so the landing page can
// disable "Start interview" before a session is ever created. `enabled` is true
// only when the selected provider has an API key set (see src/lib/llm).
export async function GET() {
  const p = activeProvider();
  return NextResponse.json(
    { id: p.id, model: p.model, enabled: p.enabled },
    { headers: { "Cache-Control": "no-store" } },
  );
}
