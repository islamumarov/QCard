// Interview history — past sessions for the signed-in user, newest first.
// Server component: reads SQLite directly (Node runtime, dynamic). Mirrors the
// gracefully-optional auth pattern — when Google OAuth is not configured, or
// nobody is signed in, the page degrades to a friendly explanation instead of
// listing anonymous sessions.
import Link from "next/link";
import { auth, authConfigured } from "@/auth";
import { getFeedback, getSessionsForUser, getSkippedCount } from "@/lib/db";
import { getLevel, isLevelId, LEVEL_LIST } from "@/lib/levels";
import { getMethodology, isMethodologyId, METHODOLOGY_LIST } from "@/lib/methodologies";
import DeleteSessionButton from "@/components/DeleteSessionButton";
import RatingTrend, { type TrendPoint } from "@/components/RatingTrend";
import type { LevelId, MethodologyId } from "@/lib/types";

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
        <div className="flex items-center gap-2">
          <Link href="/compare" className="chip">
            ⇄ Compare
          </Link>
          <Link href="/" className="chip">
            ← New interview
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}

// A native GET-form filter so a candidate can isolate, e.g., just their L5 STAR
// runs. No client JS — selects submit via the form's "Apply" button; "Clear"
// is a plain link back to /history.
function FilterBar({
  level,
  framework,
}: {
  level: LevelId | "";
  framework: MethodologyId | "";
}) {
  const active = level !== "" || framework !== "";
  return (
    <form method="GET" className="deck-card flex flex-wrap items-end gap-3 p-4">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Level
        <select name="level" defaultValue={level} className="chip text-sm">
          <option value="">All levels</option>
          {LEVEL_LIST.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Framework
        <select name="framework" defaultValue={framework} className="chip text-sm">
          <option value="">All frameworks</option>
          {METHODOLOGY_LIST.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn text-sm">
        Apply
      </button>
      {active && (
        <Link href="/history" className="chip text-sm hover:bg-surface-2">
          Clear
        </Link>
      )}
    </form>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; framework?: string }>;
}) {
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

  const allSessions = getSessionsForUser(user.email);

  if (allSessions.length === 0) {
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

  // Optional level/framework filter (validated; unknown values are ignored).
  const params = await searchParams;
  const levelFilter: LevelId | "" = isLevelId(params.level) ? params.level : "";
  const frameworkFilter: MethodologyId | "" = isMethodologyId(params.framework)
    ? params.framework
    : "";
  const sessions = allSessions.filter(
    (s) =>
      (levelFilter === "" || s.level === levelFilter) &&
      (frameworkFilter === "" || s.methodology === frameworkFilter),
  );

  // Rating-over-time trend: completed sessions that have feedback, oldest→newest
  // (sessions arrive newest-first). Only meaningful with ≥2 points.
  const trendPoints: TrendPoint[] = sessions
    .filter((s) => s.status === "completed")
    .map((s) => {
      const feedback = getFeedback(s.id);
      if (!feedback) return null;
      const level = getLevel(s.level);
      const methodology = getMethodology(s.methodology);
      return {
        rating: feedback.rating,
        date: s.created_at,
        level: level.shortLabel,
        framework: methodology.name,
        levelId: s.level,
        methodologyId: s.methodology,
      } satisfies TrendPoint;
    })
    .filter((p): p is TrendPoint => p !== null)
    .reverse();

  return (
    <Shell>
      <FilterBar level={levelFilter} framework={frameworkFilter} />
      {sessions.length === 0 ? (
        <div className="deck-card p-6 text-sm text-muted">
          No interviews match this filter.{" "}
          <Link href="/history" className="font-semibold text-accent hover:underline">
            Clear it
          </Link>{" "}
          to see all {allSessions.length}.
        </div>
      ) : (
        <>
          <RatingTrend points={trendPoints} />
          <ul className="flex flex-col gap-3">
        {sessions.map((s) => {
          const level = getLevel(s.level);
          const methodology = getMethodology(s.methodology);
          const feedback = getFeedback(s.id);
          const skipped = getSkippedCount(s.id);
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
                    {skipped > 0 && (
                      <span
                        className="chip text-xs text-amber-300"
                        title={`${skipped} question${skipped === 1 ? "" : "s"} skipped`}
                      >
                        ⏭ {skipped} skipped
                      </span>
                    )}
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
                  <Link
                    href={`/interview/${s.id}/review`}
                    className="chip text-xs hover:bg-surface-2"
                    title="Printable review"
                    aria-label={`Open printable review of ${level.shortLabel} ${methodology.name} interview`}
                  >
                    Review
                  </Link>
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
        </>
      )}
    </Shell>
  );
}
