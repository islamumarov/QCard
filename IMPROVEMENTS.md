# QCard — Continuous Improvement Log

Self-paced improvement loop. Each iteration: pick ONE item, implement, `npm run build`
(Node 22), commit + push, update this file. Scope: **Google OAuth sign-in · UX & a11y · features**.

## Done

- **Filter `/history` by level & framework** — a native GET-form filter bar now
  sits atop the history page so a candidate can isolate, e.g., just their L5 STAR
  runs. New `FilterBar` (in `history/page.tsx`) renders two `<select>`s (Level
  from `LEVEL_LIST`, Framework from `METHODOLOGY_LIST`, each with an "All …"
  default) plus an **Apply** submit and a **Clear** link back to `/history` —
  no client JS, the form just GETs with `?level=&framework=`. `HistoryPage` now
  reads `searchParams`, validates the two params with `isLevelId`/`isMethodologyId`
  (unknown values ignored), and filters the session list once; both the
  `RatingTrend` sparkline and the row list reflect the active filter, so the trend
  isolates the chosen slice. When a filter matches nothing, a friendly card offers
  to clear it back to all N sessions. _(iteration 27)_
- **Unit tests for the pure deck/level/prompt logic** — the core pure functions
  had no coverage; added a zero-new-deps test harness using Node's built-in
  `node:test` runner via `tsx`. New `npm test` script (`tsx --test tests/*.test.ts`,
  gated by the same `check:node` prereq as the other scripts). `tests/lib.test.ts`
  (16 tests) pins down: `levelBand` (span math + every `QUESTION_BANK` seed yields
  a valid 3..7 band), the level lookups (`isLevelId`/`getLevel`/`numericLevel`
  fallback-to-default behaviour, `expectationsBlock` bullets), the methodology
  lookups (`isMethodologyId`/`getMethodology`/`stepsBlock`/`componentList`,
  incl. the "Situation, Task, Action, or Result" trailing-or join), the prompt
  builders (`interviewerSystem`/`feedbackSystem` weave in framework name, level
  title, calibration text, and every expectation bullet), and
  `pickQuestionsForLevel` against a throwaway in-memory better-sqlite3 seeded from
  the real `QUESTION_BANK` (exactly N distinct picks at every level, pool centred
  near the target, never-empty on an out-of-range level, caps at pool size when N
  exceeds it). Build stays clean — `tests/` is outside the Next app. _(iteration 26)_
- **Rating trend sparkline on `/history`** — a small inline SVG chart of rating
  over time now sits atop the history list so progress is visible at a glance
  without opening `/compare`. New pure-SVG, dependency-free, server-rendered
  `src/components/RatingTrend.tsx` plots completed-interview ratings oldest→newest
  on a fixed 1..10 scale (so runs are comparable): an accent trend line + soft
  area fill, dots tinted by the same green/amber/rose bands as the score badges
  (`<title>` tooltip per dot showing date · level framework → N/10), dashed
  threshold guides at 5 and 8, axis labels, and first/last date markers. The
  `<figcaption>` shows the count and a signed delta-since-first chip; the whole
  `<svg>` carries a spoken `aria-label` summary. `history/page.tsx` derives the
  points from `getSessionsForUser` + `getFeedback` (completed sessions only,
  reversed to chronological), and the component self-hides below 2 points. No new
  deps, no client JS. _(iteration 25)_
- **Compare two interviews (progress diff + AI advice)** — new `/compare` route
  lets a signed-in user pick two of their *completed* interviews and see how they
  progressed. Deterministic half lives in `src/lib/compare.ts` (`loadCompareSide`
  reuses `buildInterviewState`; `orderByDate` puts them oldest→newest; `diffSides`
  computes rating/pace/skipped deltas) and renders instantly server-side: two
  side cards (rating · time · skipped) plus a signed delta row (green/rose by
  whether the direction is good — up is good for rating, down for time/skips).
  Qualitative half is on-demand: `CompareAdvice` (client) POSTs the two ids to
  new `POST /api/compare`, which enforces ownership (auth-configured), requires
  both finished, and calls `generateComparison` → a new `"comparison"` LLM schema
  (`improved`/`regressed`/`focus`/`summary`) wired through `prompts.ts`,
  `anthropic.ts`, `gemini.ts`, with a `fallbackComparison(ratingDelta)` offline
  default. Pickers are a native GET form (no client JS); a **⇄ Compare** chip was
  added to the `/history` header. Gracefully degrades like the rest of the app
  (auth unconfigured / signed-out / <2 sessions / no LLM key). _(iteration 24)_
- **Per-session detail/review view** — already shipped: `/interview/{id}/review`
  is the consolidated read-only detail page (transcript + rating/strengths/
  improvements/expectations/advice + pacing + skipped chip), owner-guarded, linked
  from every `/history` row. Closed as done. _(folded into iterations 12/17/19)_
- **Friendly 429 "slow down" message in the interview client** — when a mutating
  LLM route returns 429 from the per-IP rate limiter, the candidate now sees a
  human message instead of the generic failure text. New
  `messageForFailedResponse(res, fallback)` helper in `InterviewClient.tsx`
  reads the `Retry-After` header on a 429 and renders "Slow down a touch — too
  many requests in a short time. Try again in N seconds." (singular-aware, with
  a "give it a moment" fallback when the header is missing/zero); for any other
  non-ok status it falls back to the parsed `err.error` then the caller's
  default. Wired into all four POST fetches — `/api/answer`, `/api/answer/retry`,
  `/api/answer/skip`, and `/api/feedback` (which now also checks `res.ok`
  before parsing). _(iteration 23)_
- **Rate-limit / abuse guard on the API routes** — the LLM-backed endpoints had
  no throttle. New `src/lib/ratelimit.ts` is a dependency-free in-memory
  fixed-window limiter: `enforceRateLimit(req, name, { limit, windowMs? })`
  buckets per-IP (first hop of `x-forwarded-for`, then `x-real-ip`, then a shared
  `unknown` key) and returns a 429 `NextResponse` with a `Retry-After` header
  when over the window, else `null`. Buckets live in a `Map` capped at 10k
  entries (expired windows are swept before insert past the cap). Gracefully
  optional like the LLM-key/auth pattern: `RATE_LIMIT_DISABLED=1` turns it off
  (documented in `.env.local.example`). Wired into every mutating LLM/proxy
  route at the top of the handler: `/api/session` (10/min — heaviest, builds a
  deck), `/api/answer` + `/api/answer/retry` + `/api/answer/skip` (30/min,
  sharing the `answer` bucket), `/api/feedback` (10/min), `/api/tts` (60/min).
  Read-only GETs (`/api/session/[id]`, export, provider, auth, tts GET probe) are
  left open. _(iteration 22)_
- **AI improvement advice in the feedback report** — beyond strengths/improvements/
  expectations, the final report now carries an actionable "how to fix what went
  wrong" section. New optional `advice?: string[]` on `Feedback` (and nullable
  `advice` column on `feedbacks`, via an additive `ensureColumn` migration —
  rows saved before the column read back `undefined`). `feedbackSystem` instructs
  the coach to write one concrete next step per weak point (a drill, a rephrased
  answer, or a framework component to rehearse, with a usable-not-generic
  example); the field is added to `FEEDBACK_JSON_SCHEMA` (required) and a
  transcript-agnostic offline default lives in `fallbackFeedback`. `generateFeedback`
  normalizes a missing/non-array `advice` to `undefined`. `FeedbackReport` and the
  printable `/interview/{id}/review` page render it as a distinct accent-tinted
  "How to improve next time" block below the three lists; the Markdown export gains
  a matching `### How to improve next time` section and the JSON export carries it
  via the embedded `feedback` object. _(iteration 21)_
- **Skipped count in the Markdown export header** — `buildMarkdown` now emits a
  `- **⏭ Skipped:** N question(s)` bullet in the header block (after Questions)
  whenever `state.skippedCount > 0`, with singular/plural wording, for parity with
  the on-screen feedback/history chips and the printable review page. JSON export
  already carried `skippedCount`. _(iteration 20)_
- **Pacing + skipped chip on the printable review page** — the read-only
  `/interview/{id}/review` route now mirrors the live `FeedbackReport` for a
  complete saved/printed record. A new **Pacing** `deck-card` section (local
  `fmtDuration`/`paceTone` helpers copied from the report) renders the
  per-question Q# · category → M:SS breakdown with a total row and the same soft
  thresholds (neutral <2 min, amber past 2, rose past 4), shown only when
  `state.pacing` exists. The summary header now also carries the amber **⏭ N
  skipped** chip (singular/plural `title`) when `state.skippedCount > 0`, matching
  the report and `/history` rows. _(iteration 19)_
- **Skipped-question count in history/feedback** — now that skips are logged as
  `system`/`skip` markers, the count is surfaced. New `getSkippedCount(sessionId)`
  in `db.ts` (a `COUNT(*) ... WHERE kind = 'skip'`), and `buildInterviewState`
  derives `skippedCount` (new `InterviewState` field) from the already-loaded
  messages. `FeedbackReport` shows an amber **⏭ N skipped** chip beside the
  "Interview feedback" heading when `state.skippedCount > 0`; each `/history` row
  shows the same chip in its badge row. `buildJSON` export now includes
  `skippedCount`. Singular/plural-aware `title` on both chips. _(iteration 18)_
- **Pacing summary in feedback** — the final report now surfaces how long the
  candidate spent on each question. New `Pacing`/`PacingEntry` types and a
  `pacing` field on `InterviewState`; `buildInterviewState` derives it server-side
  in `buildPacing()` by grouping messages by `session_question_id` (via new
  `getSessionQuestions()`) and taking each question's span from its first message
  (the card) to its last (created_at timestamps), summing to a total — only
  questions actually reached are counted, `null` if nothing's been answered.
  `FeedbackReport` renders a **Pacing** section (Q# · category → M:SS, with a
  total row) using the same soft thresholds as the live composer timer (neutral
  under 2 min, amber past 2, rose past 4). Pacing also flows into the Markdown
  export (a `## Pacing` block) and the JSON export. _(iteration 17)_
- **"Skip this question" option** — candidates can now move past a card they
  can't (or would rather not) answer instead of being stuck. New `MessageKind`
  `"skip"` and `skipQuestion(sessionId)` in `db.ts` log a `system`/`skip` marker
  on the active card, then reuse `advanceToNextQuestion` (so it advances or
  finishes exactly like a normal answer would). New `POST /api/answer/skip`
  mirrors the answer route — guards an active question, skips, reveals the next
  main card (or lets the client request feedback when it was the last). The
  composer shows a **⏭ Skip question** chip beside Redo whenever a question is
  open (a `window.confirm` guards the irreversible move); the skipped card renders
  as a quiet centered "⏭ Question skipped" marker in the transcript, the review
  page and MD/JSON exports label it "Skipped", and `renderFullTranscript` feeds
  the feedback model `(skipped this question — no answer given)` so the final
  report accounts for it. _(iteration 16)_
- **Per-question pacing timer** — the progress row now shows a live `⏱ M:SS`
  chip counting time on the current question. State `elapsed` ticks once a second
  via `setInterval` only while `awaiting === "answer"` and not `busy` (so the
  clock pauses while the interviewer is "thinking" and stops at feedback/done);
  it resets on `currentMainIndex` change, so follow-ups share one clock and the
  chip reflects total time on the whole question. `pacingHint(seconds)` gives soft
  advisory styling — neutral under 2 min, amber past ~2 min, rose past ~4 min —
  with a `title` tip and an `aria-label`/`role="timer"` spoken time. Purely
  advisory; never blocks submission. _(iteration 15)_
- **"Retry this answer" before moving on** — candidates can now redo their most
  recent answer to the current question instead of being locked in once they hit
  Send. New `retryLastAnswer(sessionId)` in `db.ts` deletes the last candidate
  `answer` message and any interviewer reply that followed it (scoped to the
  *active* session-question — a card that's been left behind stays locked) in a
  single transaction, rolling `followups_asked` back by however many follow-ups
  were removed so pacing stays correct; it returns the removed text. New
  `POST /api/answer/retry` wraps it and returns `buildInterviewState` plus
  `restoredAnswer`. `InterviewClient` shows a **↩ Redo last answer** chip in the
  composer whenever the active question already has an answer (detected from the
  transcript: any `answer` turn after the last `main` card); clicking it cancels
  TTS/STT, calls the route, and repopulates the textarea with the prior answer to
  edit. _(iteration 14)_
- **Mobile layout polish pass** — the app now respects small screens and notched
  devices. `layout.tsx` exports a `viewport` with `viewportFit: "cover"` so the
  page can extend under the notch/home-indicator, and `globals.css` adds
  `env(safe-area-inset-*)` padding on `<body>` (left/right/bottom) plus a
  `100dvh` `min-height` so the dynamic viewport (mobile browser chrome / keyboard)
  no longer clips content. The header is now `flex-wrap` with a `gap` and the long
  "behavioral interview practice" chip is `hidden sm:inline-flex`, so the
  logo/theme/auth controls never get squished on narrow widths. In the interview
  view the transcript switched from `max-h-[42vh]` to `max-h-[50dvh]
  sm:max-h-[42vh]` — on phones it shrinks with the dynamic viewport so the
  composer stays reachable above the keyboard — and the composer's button row is
  `flex-wrap` so Speak/Clear and Send wrap instead of overflowing. _(iteration 13)_
- **Printable per-session review page** — new read-only `/interview/{id}/review`
  server route lays out the full transcript + feedback for reading or saving as
  PDF. It reuses `buildInterviewState(id)` and enforces the same ownership guard
  as the export route (owner-only when auth is configured, open when it isn't,
  `notFound()` otherwise). The transcript renders as flat speaker-labelled blocks
  (candidate answers get an accent left-border) instead of chat bubbles, with a
  summary header (level/framework/date/question count/score) and the three
  feedback sections. A client `PrintButton` calls `window.print()`; new `@media
  print` rules in `globals.css` drop the app header/footer and any `.no-print`
  chrome and force the `.print-area` to black-on-white cards. Inline ⬇ MD / ⬇
  JSON links reuse the export route. Entry points: a "🖨 Printable review" link in
  the live feedback report and a **Review** chip on each `/history` row.
  _(iteration 12)_
- **Keyboard nav for landing choosers** — the methodology list and the level bar
  on `/` are now proper WAI-ARIA radiogroups instead of `aria-pressed` button
  grids. New reusable `src/components/RadioGroup.tsx` implements the roving-tabindex
  pattern: only the selected option is tab-focusable, and Arrow keys (Up/Down for
  the vertical methodology list, Left/Right for the horizontal level bar) move both
  focus and selection, with Home/End jumping to the ends and wrap-around. It's
  render-prop driven (`content`/`className`/`ariaLabel`/`title` per option) so the
  two visually-different choosers share one keyboard behaviour. `page.tsx` maps its
  existing option markup into the component unchanged; the methodology check icon is
  `aria-hidden` and each option carries a full spoken `aria-label`. _(iteration 11)_
- **Manual theme toggle (light/dark/system)** — added an explicit switch on top of
  the OS-following light theme. New client `src/components/ThemeToggle.tsx` cycles
  system → light → dark, persisting the choice in `localStorage` (`qcard-theme`) and
  setting `data-theme` on `<html>`. `globals.css` now carries the dark vars under
  `:root, :root[data-theme="dark"]`, an explicit light block under
  `:root[data-theme="light"]`, and the OS-preference light block guarded by
  `:root:not([data-theme])` so an explicit choice always wins over the media query.
  A tiny inline script in `layout.tsx` (`<head>`) applies the stored choice before
  first paint to avoid a theme flash; `<html suppressHydrationWarning>` covers the
  attribute. The toggle chip sits in the header next to auth. _(iteration 10)_
- **Light theme + `prefers-color-scheme`** — the app was dark-only; it now ships a
  light palette that swaps in automatically from the OS preference, no JS and no
  `dark:` variants. `globals.css` defines semantic CSS vars (`--bg`, `--card`,
  `--fg`, `--muted`, `--subtle`, `--edge`/`--edge-strong`, `--surface`/`--surface-2`,
  plus background-gradient `--grad-1/2`) with a `@media (prefers-color-scheme: light)`
  override; `tailwind.config.ts` exposes them as theme-aware color tokens
  (`bg`, `card`, `surface`, `surface-2`, `edge`, `edge-strong`, `fg`, `muted`,
  `subtle`). Every hardcoded `slate-*` / `white\/*` / `bg-ink` class across the 8
  color-using files was migrated to those tokens, and `.btn`/`.chip`/`.deck-card`
  now reference them, so flipping a dozen variables reskins the whole UI. Accent and
  status colours (emerald/amber/rose) stay as-is — they read on both backgrounds.
  _(iteration 9)_
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

1. **"Practice this advice" CTA** — link each `advice` item back into a fresh
   session pre-filtered to the weak category/level so the candidate can drill it
   immediately, closing the feedback→practice loop.
2. **Pacing in the JSON export header** — `pacing` is already a top-level JSON
   field; consider whether a flattened summary (avg/total) helps consumers.
3. **Compare more than two / "vs. your best"** — extend `/compare` to diff the
   latest session against the user's highest-rated one, or chart all sessions of a
   given level/framework. Builds directly on `src/lib/compare.ts`.
4. **Per-level/framework averages on `/history`** — now that the page can filter,
   show a small stat row (count · avg rating · best) for the current filter slice,
   reusing the already-loaded feedback. No new queries.

## Backlog (ideas)

- Per-question timer / pacing indicator.
- "Retry this answer" before moving on.
- Difficulty/level mismatch warning if the deck had to widen far from target.
- Extend `npm test` coverage to the DB lifecycle helpers (`retryLastAnswer`,
  `skipQuestion`, `advanceToNextQuestion`) and the export/compare pure builders
  (`buildMarkdown`/`buildJSON`, `diffSides`) against in-memory DBs.
- GitHub Actions CI: run `npm ci && npm test && npm run build` on push/PR (Node 22)
  so a red test or broken build is caught before it lands on master.
- Analytics: aggregate ratings over time per level/framework.
- Auto-retry a 429 after the `Retry-After` window (with a countdown) instead of
  asking the candidate to resubmit manually.

## Conventions

- Node 22 via `nvm use` for all npm/node commands (better-sqlite3 ABI).
- Always `npm run build` before commit. Keep each change focused.
- Commit style: imperative subject + short body; co-author trailer.
