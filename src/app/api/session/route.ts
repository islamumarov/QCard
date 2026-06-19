import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/auth";
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
    // Stamp the session with the signed-in user when auth is configured;
    // anonymous (null) otherwise, mirroring the gracefully-optional pattern.
    const userId = authConfigured ? ((await auth())?.user?.email ?? null) : null;
    const session = createSession(methodology, level, userId);
    return NextResponse.json(buildInterviewState(session.id));
  } catch (err) {
    console.error("create session failed", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
