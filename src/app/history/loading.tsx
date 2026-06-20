// Route-segment loading UI for /history. Shown while the server component reads
// SQLite + resolves the session. Reuses the page Shell heading so the swap to
// real content is seamless.
import Link from "next/link";
import { HistorySkeleton } from "@/components/Skeleton";

export default function HistoryLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Interview history</h1>
        <Link href="/" className="chip">
          ← New interview
        </Link>
      </div>
      <p className="sr-only" role="status">
        Loading your interview history…
      </p>
      <HistorySkeleton />
    </div>
  );
}
