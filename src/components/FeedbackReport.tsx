import type { Feedback, InterviewState } from "@/lib/types";
import { buildJSON, buildMarkdown, downloadText, exportFilename } from "@/lib/export";

function List({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" | "info" | "accent" }) {
  const dot = tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : tone === "accent" ? "bg-accent" : "bg-accent2";
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

// The "How to improve next time" advice list, but each item carries a "Drill
// this" link that starts a fresh interview at the same slice with that exact
// weakness threaded into the interviewer + coach prompts (?focus=).
function AdviceWithDrill({ items, state }: { items: string[]; state: InterviewState }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">How to improve next time</h3>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-fg">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span className="min-w-0">
              {it}
              <a
                href={`/?level=${state.level.id}&framework=${state.methodology.id}&focus=${encodeURIComponent(it)}`}
                className="ml-2 inline-block whitespace-nowrap text-xs font-semibold text-accent hover:underline"
                title="Start a fresh interview that drills this specific gap"
              >
                🎯 Drill this →
              </a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// M:SS for a duration in seconds.
function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Soft tone for per-question time — mirrors the live composer's pacing hint
// (~2 min target, amber past 2, rose past 4). Purely advisory.
function paceTone(seconds: number): string {
  if (seconds >= 240) return "text-rose-400";
  if (seconds >= 120) return "text-amber-400";
  return "text-muted";
}

function Pacing({ pacing }: { pacing: NonNullable<InterviewState["pacing"]> }) {
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Pacing</h3>
      <ul className="space-y-1.5">
        {pacing.perQuestion.map((p) => (
          <li key={p.position} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-fg">
              <span className="text-muted">Q{p.position}</span> · {p.category}
            </span>
            <span className={`tabular-nums font-medium ${paceTone(p.seconds)}`}>{fmtDuration(p.seconds)}</span>
          </li>
        ))}
        <li className="mt-1 flex items-baseline justify-between gap-3 border-t border-edge pt-1.5 text-sm font-semibold">
          <span className="text-fg">Total</span>
          <span className="tabular-nums text-fg">{fmtDuration(pacing.totalSeconds)}</span>
        </li>
      </ul>
      <p className="mt-2 text-xs text-muted">Aim for ~2 min per question — amber past 2 min, rose past 4.</p>
    </div>
  );
}

export default function FeedbackReport({ feedback, state }: { feedback: Feedback; state?: InterviewState }) {
  return (
    <div className="deck-card p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Interview feedback</h2>
          {state && state.skippedCount > 0 && (
            <span
              className="chip text-xs text-amber-300"
              title={`${state.skippedCount} question${state.skippedCount === 1 ? "" : "s"} skipped`}
            >
              ⏭ {state.skippedCount} skipped
            </span>
          )}
        </div>
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

      {feedback.advice && feedback.advice.length > 0 && (
        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
          {state ? (
            <AdviceWithDrill items={feedback.advice} state={state} />
          ) : (
            <List title="How to improve next time" items={feedback.advice} tone="accent" />
          )}
        </div>
      )}

      {state?.pacing && <Pacing pacing={state.pacing} />}

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
            <a href={`/interview/${state.sessionId}/review`} className="btn-ghost text-sm">
              🖨 Printable review
            </a>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        {state && (
          <a
            href={`/?level=${state.level.id}&framework=${state.methodology.id}`}
            className="btn-primary w-full"
            title={`Start a fresh ${state.level.name} interview with ${state.methodology.name} — drill the same slice`}
          >
            🔁 Practice again — same level &amp; framework
          </a>
        )}
        <a href="/" className={state ? "btn-ghost w-full" : "btn-primary w-full"}>
          New interview
        </a>
      </div>
    </div>
  );
}
