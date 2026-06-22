// Interview history — past sessions for the signed-in user, newest first.
// Server component: reads SQLite directly (Node runtime, dynamic). Mirrors the
// gracefully-optional auth pattern — when Google OAuth is not configured, or
// nobody is signed in, the page degrades to a friendly explanation instead of
// listing anonymous sessions.
import Link from "next/link";
import { auth, authConfigured } from "@/auth";
import { getFeedback, getSessionsForUser } from "@/lib/db";
import { getLevel } from "@/lib/levels";
import { getMethodology } from "@/lib/methodologies";
import DeleteSessionButton from "@/components/DeleteSessionButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deterministic, locale-stable date for a single server render (e.g. "Jun 20, 2026").
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Rating tint: green (strong) → amber (mixed) → rose (weak), matching a 1..10 scale.
function ratingClass(rating: number): string {
  if (rating >= 8) return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  if (rating >= 5) return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  return "border-rose-400/40 bg-rose-400/10 text-rose-300";
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Interview history</h1>
        <Link href="/" className="chip">
          ← New interview
        </Link>
      </div>
      {children}
    </div>
  );
}

export default async function HistoryPage() {
  // Auth not set up at all: history is meaningless because sessions are anonymous.
  if (!authConfigured) {
    return (
      <Shell>
        <div className="deck-card p-6 text-sm text-muted">
          Sign-in isn&apos;t configured on this deployment, so sessions aren&apos;t tied to an account and
          can&apos;t be listed here. Your latest interview still lives at its own link.
        </div>
      </Shell>
    );
  }

  const user = (await auth())?.user;
  if (!user?.email) {
    return (
      <Shell>
        <div className="deck-card p-6 text-sm text-muted">
          Sign in with Google (top right) to see your past interviews — level, framework, score, and date.
        </div>
      </Shell>
    );
  }

  const sessions = getSessionsForUser(user.email);

  if (sessions.length === 0) {
    return (
      <Shell>
        <div className="deck-card p-6 text-sm text-muted">
          No interviews yet.{" "}
          <Link href="/" className="font-semibold text-accent hover:underline">
            Start your first one
          </Link>
          .
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ul className="flex flex-col gap-3">
        {sessions.map((s) => {
          const level = getLevel(s.level);
          const methodology = getMethodology(s.methodology);
          const feedback = getFeedback(s.id);
          const completed = s.status === "completed";
          return (
            <li key={s.id} className="flex items-stretch gap-2">
              <Link
                href={`/interview/${s.id}`}
                className="deck-card flex flex-1 items-center gap-4 p-4 transition hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip">{level.shortLabel}</span>
                    <span className="chip">{methodology.name}</span>
                    <span className={`chip ${completed ? "text-emerald-300" : "text-amber-300"}`}>
                      {completed ? "Completed" : "In progress"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    {fmtDate(s.created_at)} · {level.name}
                  </div>
                </div>
                {feedback ? (
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border text-lg font-bold ${ratingClass(
                      feedback.rating,
                    )}`}
                    title={`Score ${feedback.rating}/10`}
                  >
                    {feedback.rating}
                  </span>
                ) : (
                  <span className="text-subtle" aria-hidden>
                    →
                  </span>
                )}
              </Link>
              <div className="flex flex-col items-stretch justify-center gap-1">
                <div className="flex gap-1">
                  <a
                    href={`/api/session/${s.id}/export?format=md`}
                    download
                    className="chip text-xs hover:bg-surface-2"
                    title="Download as Markdown"
                    aria-label={`Download ${level.shortLabel} ${methodology.name} interview as Markdown`}
                  >
                    MD
                  </a>
                  <a
                    href={`/api/session/${s.id}/export?format=json`}
                    download
                    className="chip text-xs hover:bg-surface-2"
                    title="Download as JSON"
                    aria-label={`Download ${level.shortLabel} ${methodology.name} interview as JSON`}
                  >
                    JSON
                  </a>
                </div>
                <DeleteSessionButton id={s.id} label={`${level.shortLabel} · ${methodology.name}`} />
              </div>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
