import { NextResponse } from "next/server";
import { createSession } from "@/lib/db";
import { buildInterviewState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/session — start a new interview, returns the initial state.
export async function POST() {
  try {
    const session = createSession();
    return NextResponse.json(buildInterviewState(session.id));
  } catch (err) {
    console.error("create session failed", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
