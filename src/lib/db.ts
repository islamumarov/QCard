import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_LEVEL, getLevel, numericLevel } from "./levels";
import { DEFAULT_METHODOLOGY, getMethodology } from "./methodologies";
import { QUESTION_BANK, levelBand } from "./questions";
import type {
  Feedback,
  FeedbackRow,
  LevelId,
  MessageKind,
  MethodologyId,
  MessageRole,
  MessageRow,
  Question,
  SessionQuestionRow,
  SessionRow,
} from "./types";

// Positive integer; a non-numeric or junk override falls back to 5 rather than
// poisoning question selection with NaN.
const mainQuestionsRaw = Number(process.env.QCARD_MAIN_QUESTIONS);
export const MAIN_QUESTIONS = Number.isFinite(mainQuestionsRaw) && mainQuestionsRaw > 0 ? Math.floor(mainQuestionsRaw) : 5;

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
      difficulty TEXT NOT NULL DEFAULT 'medium',
      level_min  INTEGER NOT NULL DEFAULT 3,
      level_max  INTEGER NOT NULL DEFAULT 7
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT,
      created_at          TEXT NOT NULL,
      finished_at         TEXT,
      status              TEXT NOT NULL DEFAULT 'in_progress',
      main_question_count INTEGER NOT NULL,
      current_main_index  INTEGER NOT NULL DEFAULT 0,
      methodology         TEXT NOT NULL DEFAULT 'star',
      level               TEXT NOT NULL DEFAULT 'L4',
      focus               TEXT
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

  // Additive migrations for databases created before a column existed.
  ensureColumn(db, "sessions", "methodology", "TEXT NOT NULL DEFAULT 'star'");
  ensureColumn(db, "questions", "level_min", "INTEGER NOT NULL DEFAULT 3");
  ensureColumn(db, "questions", "level_max", "INTEGER NOT NULL DEFAULT 7");
  ensureColumn(db, "sessions", "level", "TEXT NOT NULL DEFAULT 'L4'");
  ensureColumn(db, "sessions", "user_id", "TEXT");
  ensureColumn(db, "sessions", "focus", "TEXT");
  ensureColumn(db, "feedbacks", "advice", "TEXT");
}

// Add a column to an existing table if it isn't already present.
function ensureColumn(db: Database.Database, table: string, column: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

function seedQuestions(db: Database.Database) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO questions (category, text, difficulty, level_min, level_max) VALUES (?, ?, ?, ?, ?)",
  );
  const setBand = db.prepare("UPDATE questions SET level_min = ?, level_max = ? WHERE text = ?");

  // One-time bank top-up + band backfill, guarded by a version flag so it
  // doesn't run on every boot. Bump SEED_VERSION when the bank changes.
  const SEED_VERSION = 2;
  db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)");
  const seenRow = db.prepare("SELECT value FROM meta WHERE key = 'seed_version'").get() as
    | { value: string }
    | undefined;
  if (seenRow && Number(seenRow.value) >= SEED_VERSION) return;

  const tx = db.transaction(() => {
    for (const q of QUESTION_BANK) {
      const { levelMin, levelMax } = levelBand(q.levels);
      insert.run(q.category, q.text, q.difficulty, levelMin, levelMax); // adds new cards
      setBand.run(levelMin, levelMax, q.text); // fixes bands on legacy rows
    }
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seed_version', ?)").run(String(SEED_VERSION));
  });
  tx();
}

const now = () => new Date().toISOString();

// ---- Session lifecycle ---------------------------------------------------

// Back-compat wrapper: pick N questions at the default level.
function pickQuestions(db: Database.Database, n: number): Question[] {
  return pickQuestionsForLevel(db, n, numericLevel(DEFAULT_LEVEL));
}

// Pick N questions suited to a target SWE level (3..7).
// Band-contains is the primary filter; slack widens it when too few match;
// fit-score keeps cards centered near the level on top; categories add variety.
export function pickQuestionsForLevel(db: Database.Database, n: number, level: number): Question[] {
  const all = db.prepare("SELECT * FROM questions").all() as Question[];
  const shuffle = <T,>(a: T[]) =>
    a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

  const contains = (q: Question, slack: number) => q.level_min - slack <= level && level <= q.level_max + slack;

  // 1. Strict band membership; 2. widen by 1 in both directions until the pool
  //    is comfortably large (>= n*2), or we run out of slack. Never empty.
  let pool = all.filter((q) => contains(q, 0));
  for (const slack of [1, 2, 3, 4]) {
    if (pool.length >= Math.max(n, n * 2)) break;
    pool = all.filter((q) => contains(q, slack));
  }
  if (pool.length === 0) pool = all; // ultimate fallback

  // 3. Fit: smaller is better — distance of the target from the band center,
  //    plus a penalty for bands that don't actually contain the target.
  const fit = (q: Question) => {
    const center = (q.level_min + q.level_max) / 2;
    const miss = q.level_min <= level && level <= q.level_max ? 0 : 1;
    return Math.abs(center - level) + miss * 2;
  };

  // 4. Category variety over the POOL; within a category prefer best fit
  //    (ties broken randomly).
  const byCat = new Map<string, Question[]>();
  for (const q of pool) {
    const arr = byCat.get(q.category) ?? [];
    arr.push(q);
    byCat.set(q.category, arr);
  }
  const picked: Question[] = [];
  for (const c of shuffle([...byCat.keys()])) {
    if (picked.length >= n) break;
    const best = byCat.get(c)!.sort((a, b) => fit(a) - fit(b) || Math.random() - 0.5)[0];
    picked.push(best);
  }

  // 5. Top up across the whole pool by best fit if categories < n.
  if (picked.length < n) {
    const used = new Set(picked.map((q) => q.id));
    const rest = pool.filter((q) => !used.has(q.id)).sort((a, b) => fit(a) - fit(b) || Math.random() - 0.5);
    for (const q of rest) {
      if (picked.length >= n) break;
      picked.push(q);
      used.add(q.id);
    }
  }

  // 6. Shuffle final order so difficulty/level isn't telegraphed by position.
  return shuffle(picked).slice(0, n);
}

export function createSession(
  methodology: MethodologyId = DEFAULT_METHODOLOGY,
  level: LevelId = DEFAULT_LEVEL,
  userId: string | null = null,
  focus: string | null = null,
): SessionRow {
  const db = getDb();
  const id = randomUUID();
  const questions = pickQuestionsForLevel(db, MAIN_QUESTIONS, numericLevel(level));

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO sessions (id, user_id, created_at, status, main_question_count, current_main_index, methodology, level, focus) VALUES (?, ?, ?, 'in_progress', ?, 0, ?, ?, ?)",
    ).run(id, userId, now(), MAIN_QUESTIONS, methodology, level, focus);

    const insertSQ = db.prepare(
      "INSERT INTO session_questions (session_id, question_id, position, status) VALUES (?, ?, ?, ?)",
    );
    questions.forEach((q, i) => insertSQ.run(id, q.id, i, i === 0 ? "active" : "pending"));
  });
  tx();

  // Intro (mentions the chosen framework + target level) + first card.
  addMessage(id, null, "interviewer", "intro", introText(methodology, level));
  const firstSQ = getSessionQuestionByPosition(id, 0)!;
  const firstQ = getQuestion(firstSQ.question_id)!;
  addMessage(id, firstSQ.id, "interviewer", "main", firstQ.text);

  return getSession(id)!;
}

function introText(methodologyId: MethodologyId, levelId: LevelId): string {
  const m = getMethodology(methodologyId);
  const lvl = getLevel(levelId);
  return (
    `Welcome — thanks for making the time. I'll ask you ${MAIN_QUESTIONS} behavioral questions, ` +
    `calibrated to the ${lvl.name} bar (${lvl.scopeBlurb}). ` +
    `Please structure each answer with the ${m.name} method — ${m.expansion} — and answer as if this were a real interview. Let's begin.`
  );
}

// ---- Getters -------------------------------------------------------------

export function getSession(id: string): SessionRow | undefined {
  return getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
}

// Sessions belonging to a signed-in user, newest first — backs the history view.
export function getSessionsForUser(userId: string): SessionRow[] {
  return getDb()
    .prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as SessionRow[];
}

// Delete a session, but only if it belongs to `userId` — the ownership guard
// keeps one user from removing another's history. Child rows (session_questions,
// messages, feedbacks) go via ON DELETE CASCADE (foreign_keys pragma is ON).
// Returns true when a row was actually removed.
export function deleteSession(id: string, userId: string): boolean {
  const res = getDb()
    .prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return res.changes > 0;
}

export function getQuestion(id: number): Question | undefined {
  return getDb().prepare("SELECT * FROM questions WHERE id = ?").get(id) as Question | undefined;
}

export function getSessionQuestionByPosition(sessionId: string, position: number): SessionQuestionRow | undefined {
  return getDb()
    .prepare("SELECT * FROM session_questions WHERE session_id = ? AND position = ?")
    .get(sessionId, position) as SessionQuestionRow | undefined;
}

export function getSessionQuestions(sessionId: string): SessionQuestionRow[] {
  return getDb()
    .prepare("SELECT * FROM session_questions WHERE session_id = ? ORDER BY position ASC")
    .all(sessionId) as SessionQuestionRow[];
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

// How many questions the candidate skipped in a session (one "skip" marker per
// skipped card). Used to surface "N skipped" on the history list without loading
// the whole transcript.
export function getSkippedCount(sessionId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM messages WHERE session_id = ? AND kind = 'skip'")
    .get(sessionId) as { n: number };
  return row.n;
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
    advice: row.advice ? JSON.parse(row.advice) : undefined,
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

// Undo the candidate's most recent answer to the *currently active* question,
// along with any interviewer reply that followed it, so they can redo it before
// moving on. Returns the removed answer's text (to repopulate the composer), or
// null if there's nothing to retry. Deliberately scoped to the active question:
// once a card is left behind it's "done" and locked. followups_asked is rolled
// back by however many follow-ups were removed so pacing stays correct.
export function retryLastAnswer(sessionId: string): string | null {
  const db = getDb();
  const session = getSession(sessionId);
  if (!session || session.status === "completed") return null;
  const activeSQ = getActiveSessionQuestion(sessionId);
  if (!activeSQ) return null;

  const msgs = getMessagesForQuestion(activeSQ.id);
  let lastAnswer: MessageRow | undefined;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "candidate" && msgs[i].kind === "answer") {
      lastAnswer = msgs[i];
      break;
    }
  }
  if (!lastAnswer) return null;

  const followupsRemoved = msgs.filter(
    (m) => m.id >= lastAnswer!.id && m.role === "interviewer" && m.kind === "followup",
  ).length;

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM messages WHERE session_question_id = ? AND id >= ?").run(activeSQ.id, lastAnswer!.id);
    if (followupsRemoved > 0) {
      db.prepare("UPDATE session_questions SET followups_asked = MAX(0, followups_asked - ?) WHERE id = ?").run(
        followupsRemoved,
        activeSQ.id,
      );
    }
  });
  tx();

  return lastAnswer.content;
}

// Move past the active question without logging an answer — for a candidate who
// would rather not attempt it. Records a system "skip" marker on the card (so the
// transcript and final feedback reflect that it was skipped, not silently missed),
// then advances. Returns the next active session-question, or null when that was
// the last card (interview finished) or there was nothing active to skip.
export function skipQuestion(sessionId: string): SessionQuestionRow | null {
  const session = getSession(sessionId);
  if (!session || session.status === "completed") return null;
  const activeSQ = getActiveSessionQuestion(sessionId);
  if (!activeSQ) return null;

  addMessage(sessionId, activeSQ.id, "system", "skip", "Question skipped.");
  return advanceToNextQuestion(sessionId);
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
      "INSERT INTO feedbacks (session_id, strengths, improvements, expectations, advice, overall, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      sessionId,
      JSON.stringify(fb.strengths),
      JSON.stringify(fb.improvements),
      JSON.stringify(fb.expectations),
      fb.advice ? JSON.stringify(fb.advice) : null,
      fb.overall,
      fb.rating,
      now(),
    );
}
