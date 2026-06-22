import type { Feedback, InterviewState } from "@/lib/types";
import { buildJSON, buildMarkdown, downloadText, exportFilename } from "@/lib/export";

function List({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" | "info" }) {
  const dot = tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-accent2";
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-fg">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FeedbackReport({ feedback, state }: { feedback: Feedback; state?: InterviewState }) {
  return (
    <div className="deck-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">Interview feedback</h2>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-accent">{feedback.rating}</span>
          <span className="text-sm text-muted">/ 10</span>
        </div>
      </div>

      <p className="mb-6 rounded-xl border border-edge bg-surface p-4 text-sm leading-relaxed text-fg">
        {feedback.overall}
      </p>

      <div className="grid gap-6 sm:grid-cols-3">
        <List title="What was strong" items={feedback.strengths} tone="good" />
        <List title="What to improve" items={feedback.improvements} tone="warn" />
        <List title="What was expected" items={feedback.expectations} tone="info" />
      </div>

      {state && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Export</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-ghost text-sm"
              onClick={() => downloadText(`${exportFilename(state)}.md`, "text/markdown", buildMarkdown(state))}
            >
              ⬇ Markdown
            </button>
            <button
              className="btn-ghost text-sm"
              onClick={() => downloadText(`${exportFilename(state)}.json`, "application/json", buildJSON(state))}
            >
              ⬇ JSON
            </button>
          </div>
        </div>
      )}

      <a href="/" className="btn-primary mt-8 w-full">
        New interview
      </a>
    </div>
  );
}
