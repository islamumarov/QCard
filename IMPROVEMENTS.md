# QCard — Continuous Improvement Log

Self-paced improvement loop. Each iteration: pick ONE item, implement, `npm run build`
(Node 22), commit + push, update this file. Scope: **Google OAuth sign-in · UX & a11y · features**.

## Done

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

1. **Interview history view** — `/history` page listing past sessions (level, framework,
   rating, date) reading from SQLite via `getSessionsForUser`; resume/review a past
   transcript + feedback. Now unblocked — `user_id` + getter are wired.
2. **Export a session** — download transcript + feedback as Markdown/JSON from the
   feedback screen.

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
