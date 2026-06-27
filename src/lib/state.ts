import {
  getActiveSessionQuestion,
  getFeedback,
  getMessages,
  getQuestion,
  getSession,
  getSessionQuestions,
} from "./db";
import { getLevel } from "./levels";
import { activeProvider } from "./llm";
import { getMethodology } from "./methodologies";
import type { InterviewState, MessageRow, Pacing, Turn } from "./types";

// Derive per-question + total time from message timestamps. A question's time
// is the span from its first message (the card) to its last (the final answer
// or bridge). Only questions the candidate actually reached are counted.
function buildPacing(sessionId: string, messages: MessageRow[]): Pacing | null {
  const byQuestion = new Map<number, MessageRow[]>();
  for (const msg of messages) {
    if (msg.session_question_id == null) continue;
    const list = byQuestion.get(msg.session_question_id) ?? [];
    list.push(msg);
    byQuestion.set(msg.session_question_id, list);
  }

  const perQuestion = [];
  for (const sq of getSessionQuestions(sessionId)) {
    const group = byQuestion.get(sq.id);
    if (!group || !group.length) continue;
    const first = Date.parse(group[0].created_at);
    const last = Date.parse(group[group.length - 1].created_at);
    const seconds = Number.isFinite(first) && Number.isFinite(last) ? Math.max(0, Math.round((last - first) / 1000)) : 0;
    const q = getQuestion(sq.question_id);
    perQuestion.push({ position: sq.position, category: q?.category ?? "Question", seconds });
  }

  if (!perQuestion.length) return null;
  const totalSeconds = perQuestion.reduce((sum, p) => sum + p.seconds, 0);
  return { perQuestion, totalSeconds };
}

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
  const lvl = getLevel(session.level);

  return {
    sessionId,
    status: session.status,
    mainQuestionCount: session.main_question_count,
    currentMainIndex: session.current_main_index,
    awaiting,
    provider: activeProvider(),
    methodology: { id: m.id, name: m.name, expansion: m.expansion, steps: m.steps.map((s) => s.name) },
    level: { id: lvl.id, name: lvl.name, scopeBlurb: lvl.scopeBlurb },
    transcript,
    pacing: buildPacing(sessionId, messages),
    skippedCount: messages.filter((msg) => msg.kind === "skip").length,
    focus: session.focus,
    currentQuestion,
    feedback,
  };
}
