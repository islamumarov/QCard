// Unit tests for the pure deck/level/prompt logic — the parts of the app that
// have no LLM, DB, or network dependency and so are cheap to pin down. Run with
// `npm test` (Node 22 + tsx, using the built-in node:test runner — no new deps).
//
// `pickQuestionsForLevel` does touch a DB, but it takes the handle as an
// argument, so we exercise it against a throwaway in-memory better-sqlite3
// seeded from the same QUESTION_BANK / levelBand the real app uses.
import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";

import { levelBand, QUESTION_BANK } from "../src/lib/questions";
import {
  getLevel,
  isLevelId,
  numericLevel,
  expectationsBlock,
  DEFAULT_LEVEL,
  LEVELS,
} from "../src/lib/levels";
import {
  getMethodology,
  isMethodologyId,
  stepsBlock,
  componentList,
  DEFAULT_METHODOLOGY,
  METHODOLOGIES,
} from "../src/lib/methodologies";
import { pickQuestionsForLevel } from "../src/lib/db";
import { interviewerSystem, feedbackSystem, normalizeFocus, MAX_FOCUS_LEN } from "../src/lib/llm/prompts";
import { pacingSummary } from "../src/lib/export";
import { pickBestAndLatest } from "../src/lib/compare";

// ---- levelBand -----------------------------------------------------------

test("levelBand collapses a level set to its inclusive numeric span", () => {
  assert.deepEqual(levelBand(["L3", "L4", "L5"]), { levelMin: 3, levelMax: 5 });
  assert.deepEqual(levelBand(["L5"]), { levelMin: 5, levelMax: 5 });
  assert.deepEqual(levelBand(["L7", "L3"]), { levelMin: 3, levelMax: 7 });
});

test("every QUESTION_BANK seed produces a valid 3..7 band", () => {
  for (const q of QUESTION_BANK) {
    const { levelMin, levelMax } = levelBand(q.levels);
    assert.ok(levelMin <= levelMax, `${q.text}: min>max`);
    assert.ok(levelMin >= 3 && levelMax <= 7, `${q.text}: out of 3..7`);
  }
});

// ---- level lookups -------------------------------------------------------

test("isLevelId only accepts the five known ids", () => {
  for (const id of ["L3", "L4", "L5", "L6", "L7"]) assert.ok(isLevelId(id));
  for (const v of ["L2", "L8", "l5", "", null, undefined, 5]) assert.ok(!isLevelId(v));
});

test("getLevel falls back to the default for unknown ids", () => {
  assert.equal(getLevel("L6").id, "L6");
  assert.equal(getLevel("nope").id, DEFAULT_LEVEL);
  assert.equal(getLevel(null).id, DEFAULT_LEVEL);
  assert.equal(getLevel(undefined).id, DEFAULT_LEVEL);
});

test("numericLevel maps L3..L7 to 3..7", () => {
  assert.equal(numericLevel("L3"), 3);
  assert.equal(numericLevel("L7"), 7);
  assert.equal(numericLevel("bogus"), LEVELS[DEFAULT_LEVEL].numeric);
});

test("expectationsBlock renders one bullet per expectation", () => {
  const lvl = LEVELS.L5;
  const lines = expectationsBlock(lvl).split("\n");
  assert.equal(lines.length, lvl.expectations.length);
  assert.ok(lines.every((l) => l.startsWith("- ")));
});

// ---- methodology lookups -------------------------------------------------

test("isMethodologyId only accepts the three known ids", () => {
  for (const id of ["star", "par", "carl"]) assert.ok(isMethodologyId(id));
  for (const v of ["STAR", "soar", "", null, undefined]) assert.ok(!isMethodologyId(v));
});

test("getMethodology falls back to the default for unknown ids", () => {
  assert.equal(getMethodology("par").id, "par");
  assert.equal(getMethodology("xyz").id, DEFAULT_METHODOLOGY);
  assert.equal(getMethodology(null).id, DEFAULT_METHODOLOGY);
});

test("stepsBlock renders one bullet per step in letter — name: desc form", () => {
  const m = METHODOLOGIES.star;
  const lines = stepsBlock(m).split("\n");
  assert.equal(lines.length, m.steps.length);
  assert.ok(lines[0].startsWith(`- ${m.steps[0].letter} — ${m.steps[0].name}: `));
});

test("componentList joins names with a trailing 'or'", () => {
  // STAR -> "Situation, Task, Action, or Result"
  assert.equal(componentList(METHODOLOGIES.star), "Situation, Task, Action, or Result");
});

// ---- prompt builders -----------------------------------------------------

test("interviewerSystem weaves in the framework and the level bar", () => {
  const out = interviewerSystem(METHODOLOGIES.star, LEVELS.L5);
  assert.match(out, /STAR/);
  assert.ok(out.includes(LEVELS.L5.title));
  assert.ok(out.includes(LEVELS.L5.interviewerCalibration));
  // every expectation bullet is embedded
  for (const e of LEVELS.L5.expectations) assert.ok(out.includes(e));
});

test("feedbackSystem weaves in the framework and the feedback calibration", () => {
  const out = feedbackSystem(METHODOLOGIES.carl, LEVELS.L6);
  assert.match(out, /CARL/);
  assert.ok(out.includes(LEVELS.L6.title));
  assert.ok(out.includes(LEVELS.L6.feedbackCalibration));
  assert.ok(out.includes("advice"));
});

test("normalizeFocus trims, drops empties, caps length, and rejects non-strings", () => {
  assert.equal(normalizeFocus("  quantify impact  "), "quantify impact");
  assert.equal(normalizeFocus("   "), null);
  assert.equal(normalizeFocus(""), null);
  assert.equal(normalizeFocus(undefined), null);
  assert.equal(normalizeFocus(42), null);
  assert.equal(normalizeFocus("x".repeat(MAX_FOCUS_LEN + 50)).length, MAX_FOCUS_LEN);
});

test("interviewerSystem injects the focus only when one is given", () => {
  const focus = "Lead with the measurable outcome";
  const withFocus = interviewerSystem(METHODOLOGIES.star, LEVELS.L5, focus);
  assert.ok(withFocus.includes(focus));
  assert.match(withFocus, /practising a specific weakness/);
  // unfocused build is unchanged (no focus block)
  const plain = interviewerSystem(METHODOLOGIES.star, LEVELS.L5);
  assert.ok(!plain.includes("practising a specific weakness"));
});

test("feedbackSystem injects the focus only when one is given", () => {
  const focus = "Clarify personal ownership vs the team";
  const withFocus = feedbackSystem(METHODOLOGIES.carl, LEVELS.L6, focus);
  assert.ok(withFocus.includes(focus));
  assert.match(withFocus, /deliberately work on a specific weakness/);
  const plain = feedbackSystem(METHODOLOGIES.carl, LEVELS.L6);
  assert.ok(!plain.includes("deliberately work on a specific weakness"));
});

// ---- pickQuestionsForLevel (in-memory DB) --------------------------------

function seededDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    text TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    level_min INTEGER NOT NULL DEFAULT 3,
    level_max INTEGER NOT NULL DEFAULT 7
  )`);
  const insert = db.prepare(
    "INSERT INTO questions (category, text, difficulty, level_min, level_max) VALUES (?, ?, ?, ?, ?)",
  );
  for (const q of QUESTION_BANK) {
    const { levelMin, levelMax } = levelBand(q.levels);
    insert.run(q.category, q.text, q.difficulty, levelMin, levelMax);
  }
  return db;
}

test("pickQuestionsForLevel returns exactly N distinct questions", () => {
  const db = seededDb();
  for (const level of [3, 4, 5, 6, 7]) {
    const picked = pickQuestionsForLevel(db, 5, level);
    assert.equal(picked.length, 5, `level ${level}: wrong count`);
    const ids = new Set(picked.map((q) => q.id));
    assert.equal(ids.size, 5, `level ${level}: duplicates returned`);
  }
});

test("pickQuestionsForLevel centres the pool near the target level", () => {
  const db = seededDb();
  // At L4, the average band-centre of picks should sit nearer 4 than the
  // extremes — the fit score pulls cards toward the target.
  const picked = pickQuestionsForLevel(db, 5, 4);
  const avgCentre =
    picked.reduce((s, q) => s + (q.level_min + q.level_max) / 2, 0) / picked.length;
  assert.ok(avgCentre >= 3 && avgCentre <= 5.5, `avg centre ${avgCentre} drifted from L4`);
});

test("pickQuestionsForLevel never returns empty even for an out-of-range level", () => {
  const db = seededDb();
  // Level 99 matches no band; the slack-widen + ultimate fallback must still
  // yield a full deck rather than nothing.
  const picked = pickQuestionsForLevel(db, 5, 99);
  assert.equal(picked.length, 5);
});

test("pickQuestionsForLevel caps at the available pool when N exceeds it", () => {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, text TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'medium', level_min INTEGER NOT NULL DEFAULT 3,
    level_max INTEGER NOT NULL DEFAULT 7)`);
  const ins = db.prepare("INSERT INTO questions (category, text, level_min, level_max) VALUES (?, ?, 4, 4)");
  ins.run("A", "only question one");
  ins.run("B", "only question two");
  const picked = pickQuestionsForLevel(db, 5, 4);
  assert.equal(picked.length, 2);
});

test("pacingSummary is null without timed questions", () => {
  assert.equal(pacingSummary(null), null);
  assert.equal(pacingSummary({ perQuestion: [], totalSeconds: 0 }), null);
});

test("pacingSummary rolls up count, average, and slowest question", () => {
  const sum = pacingSummary({
    perQuestion: [
      { position: 1, category: "Ownership", seconds: 60 },
      { position: 2, category: "Conflict", seconds: 180 },
      { position: 3, category: "Ambiguity", seconds: 30 },
    ],
    totalSeconds: 270,
  });
  assert.ok(sum);
  assert.equal(sum.questions, 3);
  assert.equal(sum.totalSeconds, 270);
  assert.equal(sum.averageSeconds, 90);
  assert.deepEqual(sum.slowest, { position: 2, category: "Conflict", seconds: 180 });
});

test("pickBestAndLatest returns null with fewer than two candidates", () => {
  assert.equal(pickBestAndLatest([]), null);
  assert.equal(pickBestAndLatest([{ id: "a", createdAt: "2026-01-01", rating: 7 }]), null);
});

test("pickBestAndLatest picks highest rating and newest date", () => {
  const got = pickBestAndLatest([
    { id: "old-best", createdAt: "2026-01-01", rating: 9 },
    { id: "mid", createdAt: "2026-02-01", rating: 5 },
    { id: "latest", createdAt: "2026-03-01", rating: 7 },
  ]);
  assert.deepEqual(got, { best: "old-best", latest: "latest" });
});

test("pickBestAndLatest breaks rating ties toward the more recent run", () => {
  const got = pickBestAndLatest([
    { id: "early-8", createdAt: "2026-01-01", rating: 8 },
    { id: "late-8", createdAt: "2026-02-01", rating: 8 },
  ]);
  // both rated 8, so best === latest (late-8) → nothing to contrast → null
  assert.equal(got, null);
});

test("pickBestAndLatest returns null when the best run is also the latest", () => {
  assert.equal(
    pickBestAndLatest([
      { id: "x", createdAt: "2026-01-01", rating: 4 },
      { id: "y", createdAt: "2026-02-01", rating: 9 },
    ]),
    null,
  );
});
