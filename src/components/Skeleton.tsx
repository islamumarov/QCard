// Skeleton placeholders — calmer perceived load than a bare "Loading…".
// Pure presentational; each block pulses with the same rhythm as the recording
// mic. Decorative only, so the whole tree is hidden from assistive tech and the
// real loading status is announced via an sr-only live region by the caller.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-surface-2 ${className}`} />;
}

// Mirrors a single /history row: badge chips + meta line on the left, score box
// on the right.
export function HistoryRowSkeleton() {
  return (
    <div className="deck-card flex items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Bar className="h-6 w-16" />
          <Bar className="h-6 w-24" />
          <Bar className="h-6 w-20" />
        </div>
        <Bar className="mt-3 h-3 w-40" />
      </div>
      <Bar className="h-12 w-12 shrink-0 rounded-xl" />
    </div>
  );
}

export function HistorySkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="flex animate-pulse flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i}>
          <HistoryRowSkeleton />
        </li>
      ))}
    </ul>
  );
}

// Mirrors the interview deck: chip row, a question block, and the answer
// composer. Used while the session state is still loading.
export function InterviewSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-hidden>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Bar className="h-7 w-28" />
        <Bar className="h-7 w-32" />
        <Bar className="h-7 w-36" />
      </div>
      <div className="deck-card flex flex-col gap-3 p-6">
        <Bar className="h-3 w-24" />
        <Bar className="h-5 w-3/4" />
        <Bar className="h-5 w-1/2" />
      </div>
      <div className="deck-card flex flex-col gap-3 p-6">
        <Bar className="h-24 w-full" />
        <div className="flex justify-end gap-2">
          <Bar className="h-10 w-28" />
          <Bar className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}
