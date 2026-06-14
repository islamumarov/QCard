// The card deck: behavioral interview questions grouped by competency.
// Seeded into the `questions` table on first DB init.
//
// `levels` is the authoring format — the set of Google SWE levels a prompt
// elicits good stories for. The DB persists it as an inclusive numeric band
// (`level_min`/`level_max`) computed from this set via `levelBand()`.
import { numericLevel } from "./levels";
import type { LevelId } from "./types";

export interface SeedQuestion {
  category: string;
  text: string;
  difficulty: "easy" | "medium" | "hard";
  levels: LevelId[]; // inclusive set of levels this prompt elicits stories for
}

// Convert a seed's level set to the inclusive numeric band stored on the row.
export function levelBand(levels: LevelId[]): { levelMin: number; levelMax: number } {
  const ns = levels.map(numericLevel);
  return { levelMin: Math.min(...ns), levelMax: Math.max(...ns) };
}

export const QUESTION_BANK: SeedQuestion[] = [
  // Leadership
  { category: "Leadership", text: "Tell me about a time you led a project or team through a difficult situation.", difficulty: "medium", levels: ["L3", "L4", "L5"] },
  { category: "Leadership", text: "Describe a moment when you had to motivate a teammate who was disengaged.", difficulty: "medium", levels: ["L3", "L4", "L5"] },
  { category: "Leadership", text: "Give an example of a decision you made that was unpopular. How did you handle it?", difficulty: "hard", levels: ["L4", "L5", "L6", "L7"] },

  // Conflict
  { category: "Conflict", text: "Tell me about a conflict you had with a coworker and how you resolved it.", difficulty: "medium", levels: ["L3", "L4", "L5"] },
  { category: "Conflict", text: "Describe a time you disagreed with your manager. What did you do?", difficulty: "hard", levels: ["L4", "L5", "L6"] },
  { category: "Conflict", text: "Give an example of receiving harsh feedback. How did you respond?", difficulty: "easy", levels: ["L3", "L4"] },

  // Failure
  { category: "Failure", text: "Tell me about a time you failed. What did you learn?", difficulty: "medium", levels: ["L3", "L4", "L5"] },
  { category: "Failure", text: "Describe a project that did not go as planned. What would you do differently?", difficulty: "medium", levels: ["L3", "L4", "L5"] },
  { category: "Failure", text: "Tell me about a mistake that affected your team. How did you own it?", difficulty: "hard", levels: ["L4", "L5", "L6"] },

  // Problem Solving
  { category: "Problem Solving", text: "Describe the most complex problem you have solved. Walk me through your approach.", difficulty: "hard", levels: ["L4", "L5", "L6", "L7"] },
  { category: "Problem Solving", text: "Tell me about a time you had to make a decision with incomplete information.", difficulty: "medium", levels: ["L3", "L4", "L5"] },
  { category: "Problem Solving", text: "Give an example of a creative solution you came up with under constraints.", difficulty: "medium", levels: ["L3", "L4", "L5"] },

  // Teamwork
  { category: "Teamwork", text: "Tell me about a time you collaborated across teams to ship something.", difficulty: "easy", levels: ["L3", "L4"] },
  { category: "Teamwork", text: "Describe a situation where you helped a struggling teammate succeed.", difficulty: "easy", levels: ["L3", "L4"] },
  { category: "Teamwork", text: "Give an example of building consensus among people who disagreed.", difficulty: "hard", levels: ["L4", "L5", "L6", "L7"] },

  // Ownership
  { category: "Ownership", text: "Tell me about a time you went beyond what was expected of you.", difficulty: "medium", levels: ["L3", "L4", "L5"] },
  { category: "Ownership", text: "Describe a time you took initiative without being asked.", difficulty: "easy", levels: ["L3", "L4"] },
  { category: "Ownership", text: "Give an example of a long-term commitment you saw through despite obstacles.", difficulty: "medium", levels: ["L3", "L4", "L5"] },

  // Adaptability
  { category: "Adaptability", text: "Tell me about a time priorities changed suddenly. How did you adapt?", difficulty: "medium", levels: ["L3", "L4", "L5"] },
  { category: "Adaptability", text: "Describe learning a new skill or tool quickly to deliver something.", difficulty: "easy", levels: ["L3", "L4"] },

  // Time Management
  { category: "Time Management", text: "Tell me about a time you juggled multiple deadlines. How did you prioritize?", difficulty: "medium", levels: ["L3", "L4", "L5"] },
  { category: "Time Management", text: "Describe how you handled being overloaded with work.", difficulty: "easy", levels: ["L3", "L4"] },

  // ---- Senior-skewed additions (fill L5–L7 coverage) ----
  { category: "Leadership", text: "Tell me about a time you set the technical direction for an effort that spanned multiple teams. How did you get alignment?", difficulty: "hard", levels: ["L6", "L7"] },
  { category: "Leadership", text: "Describe a multi-quarter initiative you drove where you had to influence senior leaders without authority over them.", difficulty: "hard", levels: ["L6", "L7"] },
  { category: "Leadership", text: "Tell me about a time you grew or mentored other engineers into stronger contributors. What did you change in them?", difficulty: "hard", levels: ["L5", "L6", "L7"] },
  { category: "Problem Solving", text: "Walk me through an ambiguous, open-ended problem where you had to define the problem itself before solving it.", difficulty: "hard", levels: ["L5", "L6", "L7"] },
  { category: "Problem Solving", text: "Describe a system-design or architecture decision you made with significant long-term trade-offs. How did you reason about it?", difficulty: "hard", levels: ["L5", "L6"] },
  { category: "Ownership", text: "Tell me about a problem nobody owned that you decided to take on for the good of the org. What was the scope and impact?", difficulty: "hard", levels: ["L5", "L6", "L7"] },
  { category: "Conflict", text: "Describe a time two teams (or two senior engineers) were deadlocked on a technical decision and you broke the tie. How?", difficulty: "hard", levels: ["L5", "L6", "L7"] },
  { category: "Impact", text: "Tell me about the single highest-impact thing you delivered in the last two years. How did you measure the impact?", difficulty: "hard", levels: ["L5", "L6", "L7"] },
  { category: "Strategy", text: "Describe a time you said no to a high-visibility request because it was the wrong long-term bet. How did you make that call?", difficulty: "hard", levels: ["L6", "L7"] },
  { category: "Failure", text: "Tell me about a strategic bet you championed that failed. What was the blast radius and what did the org learn?", difficulty: "hard", levels: ["L6", "L7"] },

  // ---- Junior additions (fill L3 coverage) ----
  { category: "Problem Solving", text: "Tell me about a bug or issue you debugged in code you didn't write. How did you approach understanding it?", difficulty: "easy", levels: ["L3", "L4"] },
  { category: "Ownership", text: "Describe a task you were given with unclear instructions. What did you do to get unblocked?", difficulty: "easy", levels: ["L3", "L4"] },
  { category: "Teamwork", text: "Tell me about a time you asked for help or feedback on your work. How did you use what you got?", difficulty: "easy", levels: ["L3", "L4"] },
  { category: "Adaptability", text: "Describe your first few weeks on a new team or codebase. How did you ramp up and start contributing?", difficulty: "easy", levels: ["L3", "L4"] },
];
