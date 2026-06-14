import { getActiveSessionQuestion, getFeedback, getMessages, getQuestion, getSession } from "./db";
import { activeProvider } from "./llm";
import { getMethodology } from "./methodologies";
import type { InterviewState, Turn } from "./types";

// Build the full client-facing state for a session from the DB.
export function buildInterviewState(sessionId: string): InterviewState | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const messages = getMessages(sessionId);
  const transcript: Turn[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    kind: m.kind,
    content: m.content,
  }));

  const finished = session.current_main_index >= session.main_question_count;
  const feedback = getFeedback(sessionId);

  let currentQuestion: InterviewState["currentQuestion"] = null;
  if (!finished) {
    const activeSQ = getActiveSessionQuestion(sessionId);
    if (activeSQ) {
      const q = getQuestion(activeSQ.question_id)!;
      currentQuestion = { position: activeSQ.position, category: q.category, text: q.text };
    }
  }

  let awaiting: InterviewState["awaiting"];
  if (session.status === "completed" && feedback) awaiting = "done";
  else if (finished) awaiting = "feedback";
  else awaiting = "answer";

  const m = getMethodology(session.methodology);

  return {
    sessionId,
    status: session.status,
    mainQuestionCount: session.main_question_count,
    currentMainIndex: session.current_main_index,
    awaiting,
    provider: activeProvider(),
    methodology: { id: m.id, name: m.name, expansion: m.expansion, steps: m.steps.map((s) => s.name) },
    transcript,
    currentQuestion,
    feedback,
  };
}
