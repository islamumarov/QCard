// Shared domain types for QCard.

export type SessionStatus = "in_progress" | "completed";

// Answer framework the candidate picks at the start of a session.
export type MethodologyId = "star" | "par" | "carl";

export type MessageRole = "interviewer" | "candidate" | "system";

// What a logged message represents in the interview flow.
export type MessageKind =
  | "intro" // interviewer greeting
  | "main" // a main behavioral question (the card)
  | "followup" // an AI-generated follow-up to the candidate's answer
  | "answer" // candidate's spoken/typed answer
  | "feedback"; // final feedback block

export interface Question {
  id: number;
  category: string;
  text: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface SessionRow {
  id: string;
  created_at: string;
  finished_at: string | null;
  status: SessionStatus;
  main_question_count: number;
  current_main_index: number;
  methodology: MethodologyId;
}

export interface SessionQuestionRow {
  id: number;
  session_id: string;
  question_id: number;
  position: number;
  status: "pending" | "active" | "done";
  followups_asked: number;
}

export interface MessageRow {
  id: number;
  session_id: string;
  session_question_id: number | null;
  role: MessageRole;
  kind: MessageKind;
  content: string;
  created_at: string;
}

export interface FeedbackRow {
  id: number;
  session_id: string;
  strengths: string; // JSON array
  improvements: string; // JSON array
  expectations: string; // JSON array
  overall: string;
  rating: number; // 1..10
  created_at: string;
}

export interface Feedback {
  strengths: string[];
  improvements: string[];
  expectations: string[];
  overall: string;
  rating: number;
}

// What the LLM decides after each candidate answer.
export interface AnswerAnalysis {
  action: "followup" | "next";
  message: string; // interviewer's next utterance (a follow-up, or a bridge to the next card)
}

// One turn shown to the client.
export interface Turn {
  id: number;
  role: MessageRole;
  kind: MessageKind;
  content: string;
}

// The full state the interview UI renders.
export interface InterviewState {
  sessionId: string;
  status: SessionStatus;
  mainQuestionCount: number;
  currentMainIndex: number; // 0-based; equals count when finished
  awaiting: "answer" | "feedback" | "done";
  provider: { id: "anthropic" | "gemini"; model: string; enabled: boolean };
  methodology: { id: MethodologyId; name: string; expansion: string; steps: string[] };
  transcript: Turn[];
  currentQuestion: {
    position: number;
    category: string;
    text: string;
  } | null;
  feedback: Feedback | null;
}
