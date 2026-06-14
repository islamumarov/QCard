import { NextResponse } from "next/server";
import { analyzeAnswer } from "@/lib/llm";
import {
  addMessage,
  advanceToNextQuestion,
  getActiveSessionQuestion,
  getMessagesForQuestion,
  getQuestion,
  getSession,
  incrementFollowups,
} from "@/lib/db";
import { buildInterviewState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/answer  { sessionId, content }
// Records the candidate's answer, asks the LLM for the interviewer's next move,
// and either appends a follow-up or advances to the next card.
export async function POST(req: Request) {
  try {
    const { sessionId, content } = (await req.json()) as { sessionId?: string; content?: string };
    if (!sessionId || !content?.trim()) {
      return NextResponse.json({ error: "sessionId and content are required" }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "completed") {
      return NextResponse.json({ error: "Interview already completed" }, { status: 409 });
    }

    const activeSQ = getActiveSessionQuestion(sessionId);
    if (!activeSQ) return NextResponse.json({ error: "No active question" }, { status: 409 });

    // Log the candidate's answer.
    addMessage(sessionId, activeSQ.id, "candidate", "answer", content.trim());

    const isLastMain = session.current_main_index === session.main_question_count - 1;
    const analysis = await analyzeAnswer({
      questionMessages: getMessagesForQuestion(activeSQ.id),
      followupsAsked: activeSQ.followups_asked,
      isLastMain,
      methodology: session.methodology,
      level: session.level,
    });

    if (analysis.action === "followup") {
      addMessage(sessionId, activeSQ.id, "interviewer", "followup", analysis.message);
      incrementFollowups(activeSQ.id);
    } else {
      // Bridge line acknowledging the answer, then move on.
      addMessage(sessionId, activeSQ.id, "interviewer", "followup", analysis.message);
      const next = advanceToNextQuestion(sessionId);
      if (next) {
        const q = getQuestion(next.question_id)!;
        addMessage(sessionId, next.id, "interviewer", "main", q.text);
      }
      // If next is null the interview is finished; client will request /api/feedback.
    }

    return NextResponse.json(buildInterviewState(sessionId));
  } catch (err) {
    console.error("answer handling failed", err);
    return NextResponse.json({ error: "Failed to process answer" }, { status: 500 });
  }
}
