// Answer frameworks the candidate can choose at the start of a session.
// Each one shapes the interviewer's probing and the final feedback rubric.
import type { MethodologyId } from "./types";

export interface MethodologyStep {
  letter: string; // "S"
  name: string; // "Situation"
  desc: string; // what this component should cover
}

export interface Methodology {
  id: MethodologyId;
  name: string; // "STAR"
  expansion: string; // "Situation, Task, Action, Result"
  blurb: string; // one-line pitch for the chooser
  steps: MethodologyStep[];
  // Extra emphasis injected into the interviewer's system prompt.
  interviewerFocus: string;
  // Extra emphasis injected into the feedback rubric.
  feedbackFocus: string;
}

export const METHODOLOGIES: Record<MethodologyId, Methodology> = {
  star: {
    id: "star",
    name: "STAR",
    expansion: "Situation, Task, Action, Result",
    blurb: "The classic. Best for most behavioral questions.",
    steps: [
      { letter: "S", name: "Situation", desc: "the context and background — where and when this happened" },
      { letter: "T", name: "Task", desc: "the candidate's specific responsibility, goal, or the challenge they owned" },
      { letter: "A", name: "Action", desc: "the concrete steps the candidate personally took (their individual contribution, not the team's)" },
      { letter: "R", name: "Result", desc: "the measurable outcome and impact of those actions" },
    ],
    interviewerFocus:
      "Pay special attention to separating Task from Action, and insist on a quantified Result. If the candidate says 'we' a lot, probe for what THEY personally did.",
    feedbackFocus:
      "Reward clearly separated Situation/Task, strong first-person ownership in the Action, and a measurable Result.",
  },
  par: {
    id: "par",
    name: "PAR",
    expansion: "Problem, Action, Result",
    blurb: "Concise and punchy. Great when you want to get to the point fast.",
    steps: [
      { letter: "P", name: "Problem", desc: "the challenge or issue faced and why it mattered (the stakes)" },
      { letter: "A", name: "Action", desc: "the specific steps the candidate took to tackle the problem" },
      { letter: "R", name: "Result", desc: "the outcome and its measurable impact" },
    ],
    interviewerFocus:
      "PAR is meant to be tight, so reward concision — but make sure the Problem is framed with real stakes and the Result is quantified. Probe if the problem feels trivial or the impact is vague.",
    feedbackFocus:
      "Reward a sharply framed Problem with clear stakes, decisive Action, and a quantified Result delivered economically.",
  },
  carl: {
    id: "carl",
    name: "CARL",
    expansion: "Context, Action, Result, Learning",
    blurb: "Adds reflection. Best for growth, failure, and learning questions.",
    steps: [
      { letter: "C", name: "Context", desc: "the setting, background, and stakes of the situation" },
      { letter: "A", name: "Action", desc: "what the candidate specifically did" },
      { letter: "R", name: "Result", desc: "the outcome and measurable impact" },
      { letter: "L", name: "Learning", desc: "what the candidate took away — what they learned, how they grew, or what they'd do differently" },
    ],
    interviewerFocus:
      "CARL's distinctive component is Learning. Always make sure the candidate closes the loop with a genuine reflection — if they describe what happened but never what they learned or would change, that is exactly what to probe.",
    feedbackFocus:
      "Weight the Learning component heavily — reward authentic reflection, self-awareness, and growth, not just a good outcome.",
  },
};

export const DEFAULT_METHODOLOGY: MethodologyId = "star";

export const METHODOLOGY_LIST: Methodology[] = [METHODOLOGIES.star, METHODOLOGIES.par, METHODOLOGIES.carl];

export function isMethodologyId(v: unknown): v is MethodologyId {
  return v === "star" || v === "par" || v === "carl";
}

export function getMethodology(id?: string | null): Methodology {
  return isMethodologyId(id) ? METHODOLOGIES[id] : METHODOLOGIES[DEFAULT_METHODOLOGY];
}

// Bullet list of the steps, for embedding in a prompt.
export function stepsBlock(m: Methodology): string {
  return m.steps.map((s) => `- ${s.letter} — ${s.name}: ${s.desc}`).join("\n");
}

// Inline component list, e.g. "Situation, Task, Action, or Result".
export function componentList(m: Methodology): string {
  const names = m.steps.map((s) => s.name);
  return names.slice(0, -1).join(", ") + ", or " + names[names.length - 1];
}
