import { NextResponse } from "next/server";
import { createSession } from "@/lib/db";
import { DEFAULT_LEVEL, isLevelId } from "@/lib/levels";
import { DEFAULT_METHODOLOGY, isMethodologyId } from "@/lib/methodologies";
import { buildInterviewState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/session  { methodology?, level? } — start a new interview, returns the initial state.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const methodology = isMethodologyId(body?.methodology) ? body.methodology : DEFAULT_METHODOLOGY;
    const level = isLevelId(body?.level) ? body.level : DEFAULT_LEVEL;
    const session = createSession(methodology, level);
    return NextResponse.json(buildInterviewState(session.id));
  } catch (err) {
    console.error("create session failed", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
