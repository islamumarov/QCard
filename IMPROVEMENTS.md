# QCard — Continuous Improvement Log

Self-paced improvement loop. Each iteration: pick ONE item, implement, `npm run build`
(Node 22), commit + push, update this file. Scope: **Google OAuth sign-in · UX & a11y · features**.

## Done

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

1. **Export from history** — reuse `src/lib/export.ts` to offer the same MD/JSON
   download on each `/history` row (or a per-session review page), not only the
   live feedback screen. (Needs a server-side `buildInterviewState`-backed export,
   since `/history` has no live `InterviewState`.)
2. **Loading skeletons** — replace plain "Loading…" with skeleton cards on the
   interview + history views for a calmer perceived load.

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
