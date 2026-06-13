import { NextResponse } from "next/server";
import { generateFeedback } from "@/lib/llm";
import { addMessage, completeSession, getFeedback, getMessages, getSession, saveFeedback } from "@/lib/db";
import { buildInterviewState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/feedback  { sessionId }
// Generates and persists final feedback once all main questions are answered.
export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

    const session = getSession(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const finished = session.current_main_index >= session.main_question_count;
    if (!finished) return NextResponse.json({ error: "Interview not finished yet" }, { status: 409 });

    // Idempotent: return existing feedback if already generated.
    if (getFeedback(sessionId)) return NextResponse.json(buildInterviewState(sessionId));

    const feedback = await generateFeedback(getMessages(sessionId));
    saveFeedback(sessionId, feedback);
    addMessage(sessionId, null, "interviewer", "feedback", feedback.overall);
    completeSession(sessionId);

    return NextResponse.json(buildInterviewState(sessionId));
  } catch (err) {
    console.error("feedback generation failed", err);
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
  }
}
