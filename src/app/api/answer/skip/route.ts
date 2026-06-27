import { NextResponse } from "next/server";
import { addMessage, getActiveSessionQuestion, getQuestion, getSession, skipQuestion } from "@/lib/db";
import { buildInterviewState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/answer/skip  { sessionId }
// Advance past the current question without logging an answer, for a candidate
// who would rather not attempt it. Records a "skip" marker, then either reveals
// the next card or finishes the interview. Returns the updated interview state.
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

    const activeSQ = getActiveSessionQuestion(sessionId);
    if (!activeSQ) return NextResponse.json({ error: "No active question" }, { status: 409 });

    const next = skipQuestion(sessionId);
    if (next) {
      const q = getQuestion(next.question_id)!;
      addMessage(sessionId, next.id, "interviewer", "main", q.text);
    }
    // If next is null the interview is finished; the client will request /api/feedback.

    return NextResponse.json(buildInterviewState(sessionId));
  } catch (err) {
    console.error("skip handling failed", err);
    return NextResponse.json({ error: "Failed to skip question" }, { status: 500 });
  }
}
