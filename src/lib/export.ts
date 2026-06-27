// Build downloadable transcript + feedback exports from an interview's state.
// Pure string builders (testable) plus a browser-only download helper.

import type { InterviewState, Pacing, Turn } from "@/lib/types";

// Flattened pacing roll-up for export consumers: how many questions were timed,
// the total, the average, and the slowest single question. null when no pacing.
export interface PacingSummary {
  questions: number;
  totalSeconds: number;
  averageSeconds: number; // rounded; mean over timed questions
  slowest: { position: number; category: string; seconds: number } | null;
}

export function pacingSummary(pacing: Pacing | null): PacingSummary | null {
  if (!pacing || pacing.perQuestion.length === 0) return null;
  const questions = pacing.perQuestion.length;
  const slowest = pacing.perQuestion.reduce((a, b) => (b.seconds > a.seconds ? b : a));
  return {
    questions,
    totalSeconds: pacing.totalSeconds,
    averageSeconds: Math.round(pacing.totalSeconds / questions),
    slowest: { position: slowest.position, category: slowest.category, seconds: slowest.seconds },
  };
}

const ROLE_LABEL: Record<Turn["kind"], string> = {
  intro: "Interviewer",
  main: "Interviewer (question)",
  followup: "Interviewer",
  answer: "You",
  skip: "Skipped",
  feedback: "Interviewer",
};

// A short, filesystem-safe stem like "qcard-L5-star-2f9c1a".
export function exportFilename(state: InterviewState): string {
  const short = state.sessionId.slice(0, 6);
  return `qcard-${state.level.id}-${state.methodology.id}-${short}`;
}

export function buildMarkdown(state: InterviewState): string {
  const lines: string[] = [];
  lines.push("# QCard interview");
  lines.push("");
  lines.push(`- **Target level:** ${state.level.name}`);
  lines.push(`- **Framework:** ${state.methodology.name} (${state.methodology.steps.join(" → ")})`);
  lines.push(`- **Questions:** ${state.mainQuestionCount}`);
  if (state.skippedCount > 0) {
    lines.push(`- **⏭ Skipped:** ${state.skippedCount} question${state.skippedCount === 1 ? "" : "s"}`);
  }
  lines.push("");

  lines.push("## Transcript");
  lines.push("");
  for (const t of state.transcript) {
    lines.push(`**${ROLE_LABEL[t.kind] ?? t.role}:** ${t.content}`);
    lines.push("");
  }

  if (state.pacing) {
    lines.push("## Pacing");
    lines.push("");
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    for (const p of state.pacing.perQuestion) {
      lines.push(`- **Q${p.position} · ${p.category}:** ${fmt(p.seconds)}`);
    }
    lines.push(`- **Total:** ${fmt(state.pacing.totalSeconds)}`);
    const sum = pacingSummary(state.pacing);
    if (sum) {
      lines.push(`- **Average / question:** ${fmt(sum.averageSeconds)} (${sum.questions} timed)`);
    }
    lines.push("");
  }

  const fb = state.feedback;
  if (fb) {
    lines.push("## Feedback");
    lines.push("");
    lines.push(`**Rating:** ${fb.rating} / 10`);
    lines.push("");
    lines.push(fb.overall);
    lines.push("");
    const section = (title: string, items: string[]) => {
      if (!items.length) return;
      lines.push(`### ${title}`);
      lines.push("");
      for (const it of items) lines.push(`- ${it}`);
      lines.push("");
    };
    section("What was strong", fb.strengths);
    section("What to improve", fb.improvements);
    section("What was expected", fb.expectations);
    if (fb.advice) section("How to improve next time", fb.advice);
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function buildJSON(state: InterviewState): string {
  const payload = {
    sessionId: state.sessionId,
    level: state.level,
    methodology: state.methodology,
    mainQuestionCount: state.mainQuestionCount,
    transcript: state.transcript.map((t) => ({ role: t.role, kind: t.kind, content: t.content })),
    pacing: state.pacing,
    pacingSummary: pacingSummary(state.pacing),
    skippedCount: state.skippedCount,
    feedback: state.feedback,
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

// Trigger a client-side file download. No-op outside the browser.
export function downloadText(filename: string, mime: string, text: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
