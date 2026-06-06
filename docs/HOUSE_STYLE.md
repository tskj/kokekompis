# House style

How code in this repo is *structured* — formatting, logging, DB-query cardinality, assertions, and
boundary validation. These are intentional and enforced (eslint where mechanizable, convention
otherwise). The sister project `../heartbeet` shares this DNA; this doc is distilled from it.

> **Before finalizing any code, re-read the relevant section below.** The natural urge is to produce
> one long uniform run of lines with a `console.log` and a `.limit(1)`; these conventions actively
> counteract that.

---

## 1. Formatting (no Prettier, no auto-format)

The style would fight a formatter, so there isn't one. Apply all of these *together* — a wall of
evenly-spaced lines with no grouping is the wrong shape even when each line is individually correct.

- **Vertical alignment.** Within a contiguous block (no blank lines) where consecutive lines share
  structure, line up the `=` signs, inline `if (…)` bodies, and object-literal `:` values at the
  same column. Apply **only** when prefix-length variance is small — if padding would push the value
  column more than ~6–8 chars past the shortest line, *don't* align; split the block with a blank
  line instead. Don't re-pad a naturally-aligned group to match a wider neighbouring group — blank
  line between them, each group reads as its own table.
- **Blank lines as grouping.** Inside any non-trivial function body, separate sub-tasks with blank
  lines. Canonical progression: read inputs / set up refs → derive constants → define inner fns /
  build payloads → wire events / fetch / commit → return cleanup. Each chunk is its own alignment
  block.
- **Blank line *after* every guard.** `if (!x) return;` / `throw` / `return fail(…)` closes "the
  part where we got x" — follow it with a blank line, and never vertically-align a guard's `return`
  with the declarations above it. Guards are the *end* of a step, not a row in the table. (This pairs
  with the existing "guard clause" preferences in `CLAUDE.md`.)
- **Two spaces minimum after `if (…)`** with an inline body — signals deliberate spacing.
- **A comment attaches downward.** Blank line *above* a leading comment, none between it and the
  code it documents. A comment with no blank line above clings to the code above it, which is wrong —
  it's there to explain the code *below*.
- **Don't fight the rule with mixed `const`/`let`** (different keyword widths collide with `=`
  alignment) — keep them as separate blocks, or let a coincidental width offset do the work.
- **Tests get the same treatment** as source — readable test code is debuggable test code.

---

## 2. Logging — the EAV logger (`src/lib/log.ts`)

Structured, EAV-shaped event logging. **Don't use `console.*` in server app code.**

- One fact = one tuple `[e, a, v, ts]`. `log.info(attr, value)` asserts on the current scope's
  entity; `log.info(entity, attr, value)` asserts on an explicit entity (e.g. a recipe id, so a
  recipe's whole edit history reads as one timeline).
- **Log semantically and liberally.** Prefer a fact describing *what happened* (a `RECIPE_CREATED`
  attribute on the recipe's id) over a freeform string. Add new attributes to the `Attr` table in
  `src/lib/log.ts` — never invent attribute strings at call sites (the constants give grep-ability
  and let TS catch typos). The table currently holds the generic lifecycle attributes the logger
  emits itself, plus an auth example; grow it as you wire logging into routes/actions.
- `log.warn(kind, message, ctx)` / `log.error(kind, message, ctx)` route through the operator
  notification sink (`src/lib/report.ts`), keyed by a stable hierarchical `kind`. Use these for
  "a human should know"; use `log.info` for "this happened, make it queryable." (No mailer is wired
  yet, so report() currently just writes a structured line to the console — attach one via
  `setOperatorMailer` when you want notifications.)
- **`withRequest(req, fn)`** wraps a route handler: gives it its own ALS-scoped request entity,
  emits method/path/status/latency facts, writes a `canonical` line on close, and routes any uncaught
  error through `log.error("request.uncaught")` so a bare 500 is never silent.
  ```ts
  export async function POST(req: NextRequest) {
    return withRequest(req, async () => {
      // log.info / log.warn / log.error all correlated to this request's entity
      return NextResponse.json({ ok: true });
    });
  }
  ```
- **`withBackgroundTask(name, fn, ctx?)`** wraps work outside a request's lifetime (a cron tick,
  a boot-time seed): its own entity, started/ended/latency facts, a canonical-task line on close,
  and errors caught + routed to report() (never rethrown — nobody's awaiting it).

**Legitimate `console.*` (do NOT convert):**
- `src/lib/report.ts` — it *is* the operator sink; its console writes are the channel.
- `src/lib/log.ts` — the EAV stdout sink itself.
- Client components (`"use client"`) — they can't import the `server-only` logger.
- Standalone Node processes (`scripts/*.mjs`) and the seed (`src/lib/db/seed.ts`) — `console` is
  their output channel.

---

## 3. DB query cardinality — never `.limit(1)`

`.limit(1)` silently hides a uniqueness bug, so it's **banned by eslint** (`no-restricted-syntax` in
`eslint.config.mjs`). Express the intended cardinality with the fluent helpers in
`src/lib/cardinality.ts`, which read at the *end* of the query. The `maybe` prefix consistently means
"**`null` on zero rows**"; the bare name **fails on zero**.

| Helper | Meaning | On 0 rows | On 2+ rows |
| --- | --- | --- | --- |
| `.single("ctx")` | exactly one — an invariant | **fails loudly** | **fails loudly** |
| `.maybeSingle("ctx")` | zero or one — `null` is legit "not found" | `null` | **fails loudly** |
| `.first("ctx")` | top of ≥1, ordered (pair with `.orderBy`) | **fails loudly** | returns the top row |
| `.maybeFirst("ctx")` | top of 0+, ordered (pair with `.orderBy`) | `null` | returns the top row |
| `.exists()` | does *any* row match? (2+ is fine) | `false` | `true` |

- Use `.single` after `insert(...).returning()` (exactly one affected row guaranteed) and for
  by-id / by-unique-key lookups where a 2nd row is a bug.
- Use `.maybeSingle` for the same lookups when "not found" is normal (e.g. the cookbook-by-id lookup
  in `src/app/kokebok/[id]/layout.tsx`).
- Use `.first` / `.maybeFirst` for a **deliberate pick-one-of-many** — the old `ORDER BY … LIMIT 1`
  ("latest", "highest priority"). They return the top row with *no* duplicate check, so pair with
  `.orderBy(...)`; an unordered call returns an arbitrary row. `maybeSingle` can't serve this (it
  throws on the 2nd row). Pick `.first` when there must be at least one, `.maybeFirst` when zero is
  fine (e.g. the recipe lookup that joins through the many-to-many `recipeChapters`).
- Use `.exists()` for **existence probes** — where more than one matching row is legitimately
  possible and you only care whether *any* exists. This is the correct home for the old
  `.limit(1) … .length > 0` pattern.
- Count-based checks that intentionally read many rows (`rows.length >= N`) are fine as-is — they
  aren't `.limit(1)` and the rule doesn't touch them.

The helpers are installed by a side-effect import (`import "@/lib/cardinality"` at the top of
`src/lib/db/index.ts`) that patches `QueryPromise.prototype`. `next.config.ts` keeps `drizzle-orm`
in `serverExternalPackages` so the patch lands on the single drizzle instance the queries use (a
bundler split would make `.single()` "not a function" in production).

---

## 4. Invariants & assertions (`src/lib/assert.ts`)

Make "this can't happen" executable. Reach for the narrowest helper that fits — each documents a
different shape of expectation, and the wrong silence (a bare `!`, a swallowed branch) is how an
invariant violation becomes a confusing downstream crash.

| Helper | Use when | On violation |
| --- | --- | --- |
| `ensure(v, msg)` | a value can't be null/undefined *here* (narrows the type) | throws |
| `fail(msg)` | a hard invariant break, incl. `x ?? fail("…")` chains | reports + throws |
| `unreachable(v)` | exhaustiveness — a discriminated-union `switch` default | throws (compile-time too) |
| `shouldNever(cond, [sub,] msg)` | an "impossible" branch you'd rather **recover** from than crash in prod | see below |

- **`ensure` over `!`.** A non-null assertion (`rows[0]!`) is a silent claim; `ensure(rows[0], "…")`
  is a checked one that names the invariant and fails loudly if wrong. Use the cardinality helpers
  (`.single`/`.first`) for query rows — they already assert. Reserve `!` for genuinely hot/math paths
  where the index is locally proven, and add a comment.
- **`fail` for `??` fallbacks** that should never be taken: `const id = session.user?.id ?? fail("session has no user id")`. It reports through the operator sink *and* throws, and returns `never` so it composes inside expressions.
- **`unreachable` in `switch` defaults** over a union — the compiler then errors if a new variant is
  added without a case, and it throws at runtime if a type-system escape hatch slips through.
- **`shouldNever(cond, "sub-kind", msg)`** is the soft assert: the call site believes `cond` is
  always false. It returns the *effective* boolean so a recovery branch reads inline
  (`if (shouldNever(…)) return fallback;`). A truthy predicate reports the `should-never[:sub]` kind
  and — in dev/test — **throws**; in prod it returns `true` so the recovery runs. Tests that exercise
  the recovery on purpose wrap the call in `withShouldNeverAllowed(…)`. Setting
  `FAULT_INJECT_IMPOSSIBLE_STATE` (a 1–100 percentage) deliberately forces the recovery branch. Use
  `shouldNever` only where there's a *real* recover-in-prod branch — for pure narrowing or
  no-recovery invariants, the hard asserts (`ensure`/`fail`/`unreachable`) are the right tool.

---

## 5. Time & transactions (`src/lib/clock.ts`, `src/lib/db-tx.ts`)

- **Route all time through `src/lib/clock.ts`** (`nowMs()` / `nowDate()` / `nowIso()`), never
  `Date.now()` or zero-arg `new Date()` — tests drive a synthetic clock via `withClock(...)`.
- **Reach for `withTransaction({ name }, async (tx) => …)`** when you need a multi-statement unit to
  be atomic. It runs `SERIALIZABLE` with bounded retry on serialization-failure / deadlock, so you
  stop reasoning about interleavings and let Postgres referee. For single statements the plain `db`
  call is fine.

---

## 6. Validate untrusted data at the boundary (zod)

Data crossing a trust boundary **into** the app is **parsed** (zod), never **cast** (`as`). A cast is a
lie the type-checker believes; a parse is a check the runtime enforces. The boundaries:

- **The wire** — HTTP request bodies/params, and responses a client reads back off the network.
- **The database's untyped escape hatches** — `jsonb` columns (drizzle types the column with `$type`,
  but the bytes are whatever's stored; an old or hand-edited row is untrusted on read). The recipe
  `content` jsonb is parsed with `recipeContentSchema` on read — keep that pattern. Plain typed
  columns are already guaranteed by drizzle — don't re-validate those.
- **The browser** — `localStorage` / query params / `postMessage`.
- **Process env** and **external APIs**.

Rules:

- **Make the schema the source of truth where the shape is non-trivial.** `z.infer` the TS type *from*
  the schema so the two can't drift. Zod schemas already live next to the tables in
  `src/lib/db/schema.ts` — export and reuse them rather than declaring parallel types.
- **Fail safe for presentational / optional data; throw for genuine bad input.** A malformed jsonb row
  should degrade, not crash a page — use `schema.catch(fallback)` or `safeParse`. Reserve a throwing
  `.parse` for a boundary where *rejecting* is the correct response (a bad request body).
- **A trivial scalar boundary doesn't need a schema.** Reach for zod once the boundary value has
  *structure* (objects/arrays/enums).
