# Agent guide

**Before making code changes, read `docs/HOUSE_STYLE.md`** and follow the relevant section for the kind
of code you're touching. It is the source of truth for how code here is *structured*:

- **Formatting** — vertical alignment, blank-line grouping, blank line after every guard (no Prettier).
- **Logging** — the EAV logger `src/lib/log.ts` (`log.info/warn/error`, `withRequest`,
  `withBackgroundTask`). **No `console.*` in server app code.**
- **DB cardinality** — express intent with `src/lib/cardinality.ts` helpers
  (`.single()`/`.maybeSingle()`/`.first()`/`.maybeFirst()`/`.exists()`); **`.limit(1)` is eslint-banned.**
- **Transactions** — wrap **two or more reads** (consistent snapshot) or **two or more writes**
  (all-or-nothing) in `withTransaction({ name }, async (tx) => …)` from `src/lib/db-tx.ts`. A single
  statement is already atomic.
- **Assertions** — `src/lib/assert.ts` (`ensure`/`fail`/`unreachable`/`shouldNever`).
- **Time** — route through `src/lib/clock.ts`, never `Date.now()` / `new Date()`.
- **Boundary validation** — parse untrusted data with zod, don't cast.

Environment, local dev, database migrations, and deployment are documented in `README.md`
(dotenvx-encrypted committed `.env`, local per-worktree Postgres, Docker build on Railway).

Project conventions (Norwegian UI text/params, server components, simplicity, commit style) are in
`CLAUDE.md`.
