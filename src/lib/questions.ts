// The card deck: behavioral interview questions grouped by competency.
// Seeded into the `questions` table on first DB init.

export interface SeedQuestion {
  category: string;
  text: string;
  difficulty: "easy" | "medium" | "hard";
}

export const QUESTION_BANK: SeedQuestion[] = [
  // Leadership
  { category: "Leadership", text: "Tell me about a time you led a project or team through a difficult situation.", difficulty: "medium" },
  { category: "Leadership", text: "Describe a moment when you had to motivate a teammate who was disengaged.", difficulty: "medium" },
  { category: "Leadership", text: "Give an example of a decision you made that was unpopular. How did you handle it?", difficulty: "hard" },

  // Conflict
  { category: "Conflict", text: "Tell me about a conflict you had with a coworker and how you resolved it.", difficulty: "medium" },
  { category: "Conflict", text: "Describe a time you disagreed with your manager. What did you do?", difficulty: "hard" },
  { category: "Conflict", text: "Give an example of receiving harsh feedback. How did you respond?", difficulty: "easy" },

  // Failure
  { category: "Failure", text: "Tell me about a time you failed. What did you learn?", difficulty: "medium" },
  { category: "Failure", text: "Describe a project that did not go as planned. What would you do differently?", difficulty: "medium" },
  { category: "Failure", text: "Tell me about a mistake that affected your team. How did you own it?", difficulty: "hard" },

  // Problem Solving
  { category: "Problem Solving", text: "Describe the most complex problem you have solved. Walk me through your approach.", difficulty: "hard" },
  { category: "Problem Solving", text: "Tell me about a time you had to make a decision with incomplete information.", difficulty: "medium" },
  { category: "Problem Solving", text: "Give an example of a creative solution you came up with under constraints.", difficulty: "medium" },

  // Teamwork
  { category: "Teamwork", text: "Tell me about a time you collaborated across teams to ship something.", difficulty: "easy" },
  { category: "Teamwork", text: "Describe a situation where you helped a struggling teammate succeed.", difficulty: "easy" },
  { category: "Teamwork", text: "Give an example of building consensus among people who disagreed.", difficulty: "hard" },

  // Ownership
  { category: "Ownership", text: "Tell me about a time you went beyond what was expected of you.", difficulty: "medium" },
  { category: "Ownership", text: "Describe a time you took initiative without being asked.", difficulty: "easy" },
  { category: "Ownership", text: "Give an example of a long-term commitment you saw through despite obstacles.", difficulty: "medium" },

  // Adaptability
  { category: "Adaptability", text: "Tell me about a time priorities changed suddenly. How did you adapt?", difficulty: "medium" },
  { category: "Adaptability", text: "Describe learning a new skill or tool quickly to deliver something.", difficulty: "easy" },

  // Time Management
  { category: "Time Management", text: "Tell me about a time you juggled multiple deadlines. How did you prioritize?", difficulty: "medium" },
  { category: "Time Management", text: "Describe how you handled being overloaded with work.", difficulty: "easy" },
];
