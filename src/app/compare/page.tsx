// Compare two of the signed-in user's interviews and see progress over time.
// Server component: pick two sessions (native GET form, no client JS for the
// pickers), render the deterministic numeric deltas immediately, and offer an
// on-demand AI progress diff. Mirrors the gracefully-optional auth pattern used
// by /history — degrades to a friendly explanation when auth isn't configured
// or nobody is signed in.
import Link from "next/link";
import { auth, authConfigured } from "@/auth";
import { diffSides, loadCompareSide, orderByDate, pickBestAndLatest, type CompareSide } from "@/lib/compare";
import { getFeedback, getSessionsForUser } from "@/lib/db";
import { getLevel } from "@/lib/levels";
import { llmEnabled } from "@/lib/llm";
import { getMethodology } from "@/lib/methodologies";
import CompareAdvice from "@/components/CompareAdvice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtMinutes(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Compare interviews</h1>
        <Link href="/history" className="chip">
          ← History
        </Link>
      </div>
      {children}
    </div>
  );
}

// A signed delta chip: green when the direction is good, rose when bad, neutral
// at zero. `goodWhenUp` flips the colour mapping for metrics where lower is
// better (pacing, skips).
function Delta({ value, goodWhenUp, label, fmt }: { value: number | null; goodWhenUp: boolean; label: string; fmt: (n: number) => string }) {
  if (value == null) return <span className="text-subtle">— {label}</span>;
  const good = value === 0 ? null : goodWhenUp ? value > 0 : value < 0;
  const tone = good === null ? "text-muted" : good ? "text-emerald-300" : "text-rose-300";
  const arrow = value === 0 ? "→" : value > 0 ? "▲" : "▼";
  return (
    <span className={`font-medium ${tone}`}>
      {arrow} {fmt(Math.abs(value))} {label}
    </span>
  );
}

function SideCard({ side, when }: { side: CompareSide; when: string }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{when}</div>
      <div className="mt-1 text-sm font-semibold text-fg">
        {side.level} · {side.methodology}
      </div>
      <div className="mt-1 text-xs text-subtle">{fmtDate(side.createdAt)}</div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Rating</dt>
          <dd className="text-lg font-bold text-accent">{side.rating ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Time</dt>
          <dd className="text-lg font-bold tabular-nums text-fg">{fmtMinutes(side.totalSeconds)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Skipped</dt>
          <dd className="text-lg font-bold tabular-nums text-fg">{side.skipped}</dd>
        </div>
      </dl>
    </div>
  );
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  if (!authConfigured) {
    return (
      <Shell>
        <div className="deck-card p-6 text-sm text-muted">
          Sign-in isn&apos;t configured on this deployment, so sessions aren&apos;t tied to an account and can&apos;t be
          compared here.
        </div>
      </Shell>
    );
  }

  const user = (await auth())?.user;
  if (!user?.email) {
    return (
      <Shell>
        <div className="deck-card p-6 text-sm text-muted">
          Sign in with Google (top right) to compare two of your past interviews and see how you&apos;ve progressed.
        </div>
      </Shell>
    );
  }

  const sessions = getSessionsForUser(user.email);
  const completed = sessions.filter((s) => s.status === "completed" && getFeedback(s.id));

  if (completed.length < 2) {
    return (
      <Shell>
        <div className="deck-card p-6 text-sm text-muted">
          You need at least two completed interviews to compare.{" "}
          <Link href="/" className="font-semibold text-accent hover:underline">
            Start another one
          </Link>
          .
        </div>
      </Shell>
    );
  }

  const { a, b } = await searchParams;
  const ids = new Set(completed.map((s) => s.id));
  const selA = a && ids.has(a) ? a : completed[0].id;
  const selB = b && ids.has(b) ? b : completed[1].id;

  const candidates: { id: string; createdAt: string; rating: number }[] = [];
  const options = completed.map((s) => {
    const fb = getFeedback(s.id);
    if (fb) candidates.push({ id: s.id, createdAt: s.created_at, rating: fb.rating });
    return {
      id: s.id,
      label: `${fmtDate(s.created_at)} · ${getLevel(s.level).shortLabel} · ${getMethodology(s.methodology).name}${
        fb ? ` · ${fb.rating}/10` : ""
      }`,
    };
  });

  // One-click "latest vs. your best" — deep-links into the same picker so the
  // comparison renders immediately. Hidden when the best run is also the latest.
  const quick = pickBestAndLatest(candidates);

  // Build the comparison when two distinct, owned sessions are selected.
  let body: React.ReactNode = null;
  if (selA !== selB) {
    const sideA = loadCompareSide(selA);
    const sideB = loadCompareSide(selB);
    if (sideA && sideB) {
      const [older, newer] = orderByDate(sideA, sideB);
      const diff = diffSides(older, newer);
      body = (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <SideCard side={older} when="Earlier" />
            <SideCard side={newer} when="Later" />
          </div>
          <div className="deck-card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
            <span className="text-muted">Change, earlier → later:</span>
            <Delta value={diff.ratingDelta} goodWhenUp label="rating" fmt={(n) => String(n)} />
            <Delta value={diff.paceDelta} goodWhenUp={false} label="time" fmt={(n) => fmtMinutes(n)} />
            <Delta value={diff.skippedDelta} goodWhenUp={false} label="skipped" fmt={(n) => String(n)} />
          </div>
          <CompareAdvice a={older.id} b={newer.id} llmEnabled={llmEnabled()} />
        </>
      );
    }
  } else {
    body = <div className="deck-card p-6 text-sm text-muted">Pick two different interviews to compare.</div>;
  }

  return (
    <Shell>
      <form method="get" className="deck-card flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-muted">Earlier (or A)</span>
          <select name="a" defaultValue={selA} className="rounded-lg border border-edge bg-surface px-3 py-2 text-fg">
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-muted">Later (or B)</span>
          <select name="b" defaultValue={selB} className="rounded-lg border border-edge bg-surface px-3 py-2 text-fg">
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn px-4 py-2 text-sm">
          Compare
        </button>
        {quick && (
          <Link
            href={`/compare?a=${quick.best}&b=${quick.latest}`}
            className="chip"
            title="Compare your most recent interview against your highest-rated one"
          >
            ⚡ Latest vs. your best
          </Link>
        )}
      </form>
      {body}
    </Shell>
  );
}
