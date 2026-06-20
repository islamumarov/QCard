# QCard — Continuous Improvement Log

Self-paced improvement loop. Each iteration: pick ONE item, implement, `npm run build`
(Node 22), commit + push, update this file. Scope: **Google OAuth sign-in · UX & a11y · features**.

## Done

- **Loading skeletons** — replaced the bare "Loading…" text with pulsing
  skeleton placeholders that mirror real layout. New `src/components/Skeleton.tsx`
  exports `InterviewSkeleton` (chip row + question block + composer) and
  `HistorySkeleton`/`HistoryRowSkeleton` (badge chips + score box). The interview
  view renders `InterviewSkeleton` while session state loads; a new route-segment
  `src/app/history/loading.tsx` shows `HistorySkeleton` (reusing the page Shell
  heading) during the server fetch. Skeletons are `aria-hidden` decoration paired
  with an `sr-only` `role="status"` "Loading…" line so screen readers still get a
  spoken status. _(iteration 8)_
- **Export from history** — each `/history` row now offers **MD** and **JSON**
  download links next to its delete button. A new route handler
  `GET /api/session/:id/export?format=md|json` reuses the same pure builders as
  the live feedback screen (`buildMarkdown`/`buildJSON`/`exportFilename`) but
  server-side: it rebuilds state via `buildInterviewState(id)` and streams the
  file with a `Content-Disposition: attachment` header (so a plain `<a download>`
  works, no client `Blob`). Ownership is enforced when auth is configured — the
  caller must be signed in and own the session (matches `getSession(id).user_id`),
  returning 404 otherwise; when auth is unconfigured the route stays open like
  `GET /api/session/:id`. _(iteration 7)_
- **Delete a session** — signed-in users can remove a past interview from `/history`.
  A per-row `DeleteSessionButton` (client, `confirm()` guard) posts the id to the
  `deleteSessionAction` server action, which is a no-op unless auth is configured and
  the caller is signed in. Ownership is enforced in SQL — `deleteSession(id, userId)`
  matches on `user_id`, so a forged id can't touch another account; child rows go via
  `ON DELETE CASCADE`. The button sits as a flex sibling of the row `Link` (valid
  markup, no nested interactive elements); `revalidatePath('/history')` refreshes the
  list. _(iteration 6)_
- **Export a session** — the feedback screen now offers **Markdown** and **JSON**
  downloads of the full transcript + feedback. Pure builders live in `src/lib/export.ts`
  (`buildMarkdown`/`buildJSON`/`exportFilename`) with a browser-only `downloadText`
  Blob helper; `FeedbackReport` takes an optional `state` prop and renders the two
  buttons only when it's present (stays backward-compatible). Filenames are
  `qcard-{level}-{framework}-{shortId}.{md,json}`. _(iteration 5)_
- **Interview history view** — `/history` server page lists the signed-in user's past
  sessions (newest first) via `getSessionsForUser`, each row showing level, framework,
  status, date, and a color-tinted score badge (from `getFeedback`); rows link to
  `/interview/{id}` to resume/review. Gracefully degrades: explains itself when auth is
  unconfigured or nobody is signed in. A **History** chip appears in the header only when
  signed in. _(iteration 4)_
- **Link sessions to the signed-in user** — `sessions.user_id` (nullable, additive
  migration) is stamped on create from `(await auth())?.user?.email` in the session
  route, but only when `authConfigured` — anonymous (`null`) otherwise, mirroring the
  gracefully-optional auth pattern. Added `getSessionsForUser()` to scope history by
  user, ready for the `/history` view. `SessionRow.user_id` typed. _(iteration 3)_
- **Google OAuth sign-in (Auth.js / NextAuth v5)** — added `next-auth@5` with a
  Google provider that is gracefully optional: `authConfigured` (in `src/auth.ts`)
  is true only when `GOOGLE_CLIENT_ID`/`SECRET` are set, mirroring the LLM-key
  `enabled` pattern. Server-component `AuthButton` in the header shows Sign in /
  Sign out (no client `SessionProvider` needed); catch-all route at
  `/api/auth/[...nextauth]`; env example documents `AUTH_SECRET`. When unconfigured
  the UI hides auth entirely and `/` stays statically prerendered. _(iteration 2)_
- **a11y/UX: screen-reader transcript + keyboard submit** — transcript is now a
  `role="log"` `aria-live="polite"` region so new interviewer lines are announced; the
  answer box has `aria-label` + `aria-keyshortcuts` and submits on **Cmd/Ctrl+Enter**
  (with a visible hint). _(iteration 1)_

## Up next (highest value first)

1. **Per-session review page** — a read-only `/interview/{id}` already resumes;
   consider a dedicated printable summary view that embeds the export inline.
2. **Light theme + prefers-color-scheme** — the app is dark-only (`color-scheme: dark`);
   add a light palette and honour the OS preference.

## Backlog (ideas)

- Mobile layout polish pass (chips wrap, composer reachable, safe-area insets).
- Per-question timer / pacing indicator.
- "Retry this answer" before moving on.
- Difficulty/level mismatch warning if the deck had to widen far from target.
- Light theme + prefers-color-scheme support.
- Rate-limit / abuse guard on the API routes.
- Unit tests for `pickQuestionsForLevel`, `levelBand`, methodology/level prompt builders.
- Analytics: aggregate ratings over time per level/framework.
- Keyboard nav for the landing-page choosers (arrow keys within radiogroup).
- Loading skeletons instead of plain "Loading…".

## Conventions

- Node 22 via `nvm use` for all npm/node commands (better-sqlite3 ABI).
- Always `npm run build` before commit. Keep each change focused.
- Commit style: imperative subject + short body; co-author trailer.
