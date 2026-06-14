import { NextResponse } from "next/server";
import { createSession } from "@/lib/db";
import { DEFAULT_METHODOLOGY, isMethodologyId } from "@/lib/methodologies";
import { buildInterviewState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/session  { methodology? } — start a new interview, returns the initial state.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const methodology = isMethodologyId(body?.methodology) ? body.methodology : DEFAULT_METHODOLOGY;
    const session = createSession(methodology);
    return NextResponse.json(buildInterviewState(session.id));
  } catch (err) {
    console.error("create session failed", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
