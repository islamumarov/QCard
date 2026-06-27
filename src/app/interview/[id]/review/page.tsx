// Read-only, printable summary of a single interview — the whole transcript and
// feedback laid out for reading or saving as PDF, with inline export links.
// Server component: reads SQLite directly (Node runtime, dynamic). Mirrors the
// gracefully-optional auth pattern used by the export route — when Google OAuth
// is configured the caller must own the session; when it isn't, sessions are
// anonymous and the page stays open like GET /api/session/:id.
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, authConfigured } from "@/auth";
import { getSession } from "@/lib/db";
import { exportFilename } from "@/lib/export";
import { buildInterviewState } from "@/lib/state";
import type { MessageKind } from "@/lib/types";
import PrintButton from "@/components/PrintButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deterministic, locale-stable date for a single server render (e.g. "Jun 20, 2026").
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Speaker label per turn kind, matching the live transcript bubbles.
const ROLE_LABEL: Record<MessageKind, string> = {
  intro: "Interviewer",
  main: "Interviewer · question",
  followup: "Interviewer",
  answer: "You",
  skip: "Skipped",
  feedback: "Interviewer",
};

function FbList({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (!items.length) return null;
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

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Ownership guard, same shape as the export route.
  if (authConfigured) {
    const email = (await auth())?.user?.email;
    const session = getSession(id);
    if (!session || session.user_id !== email) notFound();
  }

  const state = buildInterviewState(id);
  if (!state) notFound();

  const session = getSession(id);
  const created = session ? fmtDate(session.created_at) : "";
  const stem = exportFilename(state);
  const fb = state.feedback;

  return (
    <div className="print-area flex flex-col gap-5">
      {/* actions — hidden from the printout */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={`/interview/${id}`} className="chip">
          ← Back to interview
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/session/${id}/export?format=md`} download className="chip hover:bg-surface-2" title="Download as Markdown">
            ⬇ MD
          </a>
          <a href={`/api/session/${id}/export?format=json`} download className="chip hover:bg-surface-2" title="Download as JSON">
            ⬇ JSON
          </a>
          <PrintButton className="btn-ghost px-3 py-1.5 text-sm" />
        </div>
      </div>

      {/* summary header */}
      <div className="deck-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Interview review</h1>
            <p className="mt-1 text-sm text-muted">
              {state.level.name} · {state.methodology.name} ({state.methodology.steps.join(" → ")})
            </p>
            <p className="mt-1 text-xs text-subtle">
              {created && `${created} · `}
              {state.mainQuestionCount} {state.mainQuestionCount === 1 ? "question" : "questions"} ·{" "}
              <span className="font-mono">{stem}</span>
            </p>
          </div>
          {fb && (
            <div className="flex shrink-0 items-baseline gap-1">
              <span className="text-3xl font-bold text-accent">{fb.rating}</span>
              <span className="text-sm text-muted">/ 10</span>
            </div>
          )}
        </div>
      </div>

      {/* transcript */}
      <div className="deck-card p-6">
        <h2 className="mb-4 text-lg font-bold">Transcript</h2>
        {state.transcript.length === 0 ? (
          <p className="text-sm text-muted">No conversation recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {state.transcript.map((t) => {
              const isYou = t.role === "candidate";
              return (
                <div key={t.id}>
                  <div className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${isYou ? "text-accent" : "text-muted"}`}>
                    {ROLE_LABEL[t.kind] ?? t.role}
                  </div>
                  <p className={`text-sm leading-relaxed text-fg ${isYou ? "pl-3 border-l-2 border-accent/40" : ""}`}>
                    {t.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* feedback */}
      {fb ? (
        <div className="deck-card p-6">
          <h2 className="mb-4 text-lg font-bold">Feedback</h2>
          <p className="mb-6 rounded-xl border border-edge bg-surface p-4 text-sm leading-relaxed text-fg">{fb.overall}</p>
          <div className="grid gap-6 sm:grid-cols-3">
            <FbList title="What was strong" items={fb.strengths} dot="bg-good" />
            <FbList title="What to improve" items={fb.improvements} dot="bg-warn" />
            <FbList title="What was expected" items={fb.expectations} dot="bg-accent2" />
          </div>
        </div>
      ) : (
        <div className="deck-card p-6 text-sm text-muted">
          This interview isn&apos;t finished yet, so there&apos;s no feedback to show.{" "}
          <Link href={`/interview/${id}`} className="font-semibold text-accent hover:underline">
            Resume it
          </Link>
          .
        </div>
      )}
    </div>
  );
}
