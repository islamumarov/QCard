import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { QUESTION_BANK } from "./questions";
import type {
  Feedback,
  FeedbackRow,
  MessageKind,
  MessageRole,
  MessageRow,
  Question,
  SessionQuestionRow,
  SessionRow,
} from "./types";

export const MAIN_QUESTIONS = Number(process.env.QCARD_MAIN_QUESTIONS || 5);

// Walk up from `start` until a directory containing package.json — the project
// root — regardless of the current working directory the server was launched from.
function findProjectRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

// Anchor project-root search on both the current working directory AND this
// module's own location, so the DB is found even when the server is launched
// from a different cwd (the module dir reliably sits under the project root).
function projectRoots(): string[] {
  const anchors: string[] = [];
  try {
    // __dirname exists in CommonJS output (Next server, tsx); guard for ESM.
    if (typeof __dirname !== "undefined") anchors.push(__dirname);
  } catch {
    /* ignore */
  }
  anchors.push(process.cwd());
  return [...new Set(anchors.map(findProjectRoot))];
}

function isExistingDbFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile() && fs.statSync(p).size > 0;
  } catch {
    return false;
  }
}

// Resolve the SQLite path robustly:
//  1. Use the configured/located path if it already exists.
//  2. Otherwise search the project structure for an existing qcard.db.
//  3. Otherwise create one at the configured path, or <projectRoot>/data/qcard.db.
function resolveDbPath(): string {
  const roots = projectRoots();
  const primaryRoot = roots[0];
  const configured = process.env.QCARD_DB_PATH;

  const candidates: string[] = [];
  if (configured) {
    if (path.isAbsolute(configured)) {
      candidates.push(configured);
    } else {
      // a relative path could be meant relative to cwd or to any project root
      candidates.push(path.resolve(process.cwd(), configured));
      for (const r of roots) candidates.push(path.resolve(r, configured));
    }
  }
  // project-structure fallbacks, for every discovered root
  for (const r of roots) {
    candidates.push(path.join(r, "data", "qcard.db"));
    candidates.push(path.join(r, "qcard.db"));
  }

  const seen = new Set<string>();
  const unique = candidates.filter((c) => (seen.has(c) ? false : (seen.add(c), true)));

  // 1 + 2: prefer the first candidate that already exists on disk.
  const existing = unique.find(isExistingDbFile);
  if (existing) {
    if (existing !== unique[0]) {
      console.warn(`[qcard] DB not at the configured/primary path; using existing DB found at ${existing}`);
    }
    return existing;
  }

  // 3: nothing exists yet — create at the configured path, else <projectRoot>/data/qcard.db.
  const target =
    configured && path.isAbsolute(configured)
      ? configured
      : configured
        ? path.resolve(primaryRoot, configured)
        : path.join(primaryRoot, "data", "qcard.db");
  console.warn(`[qcard] No existing database found; creating a new one at ${target}`);
  return target;
}

// Reuse a single connection across hot reloads in dev (Next re-evaluates modules).
const globalForDb = globalThis as unknown as { __qcardDb?: Database.Database };

function init(): Database.Database {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedQuestions(db);
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.__qcardDb) globalForDb.__qcardDb = init();
  return globalForDb.__qcardDb;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      category   TEXT NOT NULL,
      text       TEXT NOT NULL UNIQUE,
      difficulty TEXT NOT NULL DEFAULT 'medium'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id                  TEXT PRIMARY KEY,
      created_at          TEXT NOT NULL,
      finished_at         TEXT,
      status              TEXT NOT NULL DEFAULT 'in_progress',
      main_question_count INTEGER NOT NULL,
      current_main_index  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS session_questions (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id        TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      question_id       INTEGER NOT NULL REFERENCES questions(id),
      position          INTEGER NOT NULL,
      status            TEXT NOT NULL DEFAULT 'pending',
      followups_asked   INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_sq_session ON session_questions(session_id);

    CREATE TABLE IF NOT EXISTS messages (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id          TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      session_question_id INTEGER REFERENCES session_questions(id) ON DELETE CASCADE,
      role                TEXT NOT NULL,
      kind                TEXT NOT NULL,
      content             TEXT NOT NULL,
      created_at          TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_msg_session ON messages(session_id);

    CREATE TABLE IF NOT EXISTS feedbacks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      strengths    TEXT NOT NULL,
      improvements TEXT NOT NULL,
      expectations TEXT NOT NULL,
      overall      TEXT NOT NULL,
      rating       INTEGER NOT NULL,
      created_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_fb_session ON feedbacks(session_id);
  `);
}

function seedQuestions(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM questions").get() as { n: number }).n;
  if (count > 0) return;
  const insert = db.prepare("INSERT OR IGNORE INTO questions (category, text, difficulty) VALUES (?, ?, ?)");
  const tx = db.transaction(() => {
    for (const q of QUESTION_BANK) insert.run(q.category, q.text, q.difficulty);
  });
  tx();
}

const now = () => new Date().toISOString();

// ---- Session lifecycle ---------------------------------------------------

// Pick N distinct questions, preferring one per category for variety.
function pickQuestions(db: Database.Database, n: number): Question[] {
  const all = db.prepare("SELECT * FROM questions").all() as Question[];
  const byCat = new Map<string, Question[]>();
  for (const q of all) {
    const arr = byCat.get(q.category) ?? [];
    arr.push(q);
    byCat.set(q.category, arr);
  }
  const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

  const picked: Question[] = [];
  const cats = shuffle([...byCat.keys()]);
  // one from each category first
  for (const c of cats) {
    if (picked.length >= n) break;
    picked.push(shuffle(byCat.get(c)!)[0]);
  }
  // top up if we need more than there are categories
  if (picked.length < n) {
    const used = new Set(picked.map((q) => q.id));
    for (const q of shuffle(all)) {
      if (picked.length >= n) break;
      if (!used.has(q.id)) {
        picked.push(q);
        used.add(q.id);
      }
    }
  }
  return shuffle(picked).slice(0, n);
}

export function createSession(): SessionRow {
  const db = getDb();
  const id = randomUUID();
  const questions = pickQuestions(db, MAIN_QUESTIONS);

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO sessions (id, created_at, status, main_question_count, current_main_index) VALUES (?, ?, 'in_progress', ?, 0)",
    ).run(id, now(), MAIN_QUESTIONS);

    const insertSQ = db.prepare(
      "INSERT INTO session_questions (session_id, question_id, position, status) VALUES (?, ?, ?, ?)",
    );
    questions.forEach((q, i) => insertSQ.run(id, q.id, i, i === 0 ? "active" : "pending"));
  });
  tx();

  // Intro + first card as opening interviewer messages.
  addMessage(id, null, "interviewer", "intro", INTRO_TEXT);
  const firstSQ = getSessionQuestionByPosition(id, 0)!;
  const firstQ = getQuestion(firstSQ.question_id)!;
  addMessage(id, firstSQ.id, "interviewer", "main", firstQ.text);

  return getSession(id)!;
}

const INTRO_TEXT =
  "Welcome — thanks for making the time. I'll ask you a few behavioral questions. " +
  "Take your time, use specific examples (Situation, Task, Action, Result), and answer as if this were a real interview. Let's begin.";

// ---- Getters -------------------------------------------------------------

export function getSession(id: string): SessionRow | undefined {
  return getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
}

export function getQuestion(id: number): Question | undefined {
  return getDb().prepare("SELECT * FROM questions WHERE id = ?").get(id) as Question | undefined;
}

export function getSessionQuestionByPosition(sessionId: string, position: number): SessionQuestionRow | undefined {
  return getDb()
    .prepare("SELECT * FROM session_questions WHERE session_id = ? AND position = ?")
    .get(sessionId, position) as SessionQuestionRow | undefined;
}

export function getActiveSessionQuestion(sessionId: string): SessionQuestionRow | undefined {
  const s = getSession(sessionId);
  if (!s) return undefined;
  return getSessionQuestionByPosition(sessionId, s.current_main_index);
}

export function getMessages(sessionId: string): MessageRow[] {
  return getDb()
    .prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC")
    .all(sessionId) as MessageRow[];
}

// Messages that belong to one main question (the card + its follow-ups + answers).
export function getMessagesForQuestion(sessionQuestionId: number): MessageRow[] {
  return getDb()
    .prepare("SELECT * FROM messages WHERE session_question_id = ? ORDER BY id ASC")
    .all(sessionQuestionId) as MessageRow[];
}

export function getFeedback(sessionId: string): Feedback | null {
  const row = getDb()
    .prepare("SELECT * FROM feedbacks WHERE session_id = ? ORDER BY id DESC LIMIT 1")
    .get(sessionId) as FeedbackRow | undefined;
  if (!row) return null;
  return {
    strengths: JSON.parse(row.strengths),
    improvements: JSON.parse(row.improvements),
    expectations: JSON.parse(row.expectations),
    overall: row.overall,
    rating: row.rating,
  };
}

// ---- Mutations -----------------------------------------------------------

export function addMessage(
  sessionId: string,
  sessionQuestionId: number | null,
  role: MessageRole,
  kind: MessageKind,
  content: string,
): MessageRow {
  const info = getDb()
    .prepare(
      "INSERT INTO messages (session_id, session_question_id, role, kind, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(sessionId, sessionQuestionId, role, kind, content, now());
  return getDb().prepare("SELECT * FROM messages WHERE id = ?").get(info.lastInsertRowid) as MessageRow;
}

export function incrementFollowups(sessionQuestionId: number) {
  getDb().prepare("UPDATE session_questions SET followups_asked = followups_asked + 1 WHERE id = ?").run(sessionQuestionId);
}

// Close out the current card and advance. Returns the next active session-question,
// or null when all main questions are exhausted.
export function advanceToNextQuestion(sessionId: string): SessionQuestionRow | null {
  const db = getDb();
  const session = getSession(sessionId)!;
  const current = getActiveSessionQuestion(sessionId);
  if (current) db.prepare("UPDATE session_questions SET status = 'done' WHERE id = ?").run(current.id);

  const nextIndex = session.current_main_index + 1;
  db.prepare("UPDATE sessions SET current_main_index = ? WHERE id = ?").run(nextIndex, sessionId);

  if (nextIndex >= session.main_question_count) return null;

  const next = getSessionQuestionByPosition(sessionId, nextIndex)!;
  db.prepare("UPDATE session_questions SET status = 'active' WHERE id = ?").run(next.id);
  return next;
}

export function completeSession(sessionId: string) {
  getDb().prepare("UPDATE sessions SET status = 'completed', finished_at = ? WHERE id = ?").run(now(), sessionId);
}

export function saveFeedback(sessionId: string, fb: Feedback) {
  getDb()
    .prepare(
      "INSERT INTO feedbacks (session_id, strengths, improvements, expectations, overall, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      sessionId,
      JSON.stringify(fb.strengths),
      JSON.stringify(fb.improvements),
      JSON.stringify(fb.expectations),
      fb.overall,
      fb.rating,
      now(),
    );
}
