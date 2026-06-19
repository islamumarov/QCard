"use client";

import { deleteSessionAction } from "@/app/history/actions";

// A tiny destructive control rendered per history row. It posts the session id
// to the `deleteSessionAction` server action via a form (works without JS), and
// when JS is present asks for confirmation first. Sits outside the row's Link to
// keep the markup valid (no nested interactive elements).
export default function DeleteSessionButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteSessionAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete this interview (${label})? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Delete interview: ${label}`}
        title="Delete interview"
        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-300"
      >
        ✕
      </button>
    </form>
  );
}
