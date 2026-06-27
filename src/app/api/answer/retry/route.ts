import { NextResponse } from "next/server";
import { getSession, retryLastAnswer } from "@/lib/db";
import { buildInterviewState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/answer/retry  { sessionId }
// Undo the candidate's most recent answer (and the interviewer's reply to it)
// for the current question, so they can redo it before moving on. Returns the
// updated interview state plus `restoredAnswer` to repopulate the composer.
export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "completed") {
      return NextResponse.json({ error: "Interview already completed" }, { status: 409 });
    }

    const restored = retryLastAnswer(sessionId);
    if (restored === null) {
      return NextResponse.json({ error: "Nothing to retry" }, { status: 409 });
    }

    return NextResponse.json({ ...buildInterviewState(sessionId)!, restoredAnswer: restored });
  } catch (err) {
    console.error("retry handling failed", err);
    return NextResponse.json({ error: "Failed to retry answer" }, { status: 500 });
  }
}
