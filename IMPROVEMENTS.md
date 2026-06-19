# QCard — Continuous Improvement Log

Self-paced improvement loop. Each iteration: pick ONE item, implement, `npm run build`
(Node 22), commit + push, update this file. Scope: **Google OAuth sign-in · UX & a11y · features**.

## Done

- **a11y/UX: screen-reader transcript + keyboard submit** — transcript is now a
  `role="log"` `aria-live="polite"` region so new interviewer lines are announced; the
  answer box has `aria-label` + `aria-keyshortcuts` and submits on **Cmd/Ctrl+Enter**
  (with a visible hint). _(iteration 1)_

## Up next (highest value first)

1. **Google OAuth sign-in (Auth.js / NextAuth v5)** — optional, graceful when
   `GOOGLE_CLIENT_ID`/`SECRET` absent (mirrors the LLM-key fallback pattern). Sign-in/out
   in the header, `SessionProvider`, `AUTH_SECRET`. Big enough for its own iteration.
2. **Link sessions to the signed-in user** — add `sessions.user_id` (nullable), record it
   on create, scope future history to the user. Depends on #1.
3. **Interview history view** — `/history` page listing past sessions (level, framework,
   rating, date) reading from SQLite; resume/review a past transcript + feedback.
4. **Export a session** — download transcript + feedback as Markdown/JSON from the
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
