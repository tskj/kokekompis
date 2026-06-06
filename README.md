# Kokekompis.no - Next.js Boilerplate

This project is a minimal, production-ready boilerplate for a Next.js application.

## Tech Stack

- **Package Manager:** pnpm
- **Framework:** Next.js with App Router
- **Styling:** Tailwind CSS
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Authentication:** Auth.js (Google Provider)
- **Deployment:** Railway

## Local development

You need a local Postgres reachable over the default Unix socket (`/var/run/postgresql`, peer/trust
auth). Then:

```bash
pnpm install
# get .env.keys from a teammate (the dotenvx decryption key) and drop it in the repo root
pnpm dev          # http://localhost:3000
```

That's it. `pnpm dev` decrypts the shared secrets from the committed `.env`, points you at a **local**
database, and **auto-creates + migrates** it before starting Next — no manual `createdb`, no remote DB.
Each git worktree gets its own database (`kokekompis_dev_<worktree>`), so parallel worktrees never
clobber each other. Override anything in a gitignored `.env.local`; set `PGHOST` there if your Postgres
socket lives elsewhere, or `NO_WORKTREE_DB=1` to use the base name.

## Secrets (dotenvx)

Config is **committed per environment**: the dotenvx-encrypted `.env` (shared secrets) plus the
plaintext non-secret `.env.development` (local DB url, `NEXTAUTH_URL`). The only thing shared
out-of-band is `.env.keys` (the decryption key) — never committed. On Railway the same key is one
service var, `DOTENV_PRIVATE_KEY`. See `.env.example` for the full contract. Edit a secret with
`pnpm exec dotenvx set KEY value` (re-encrypts in place) and commit the result.

## Database changes

Migrations are generated locally and applied automatically (locally on `pnpm dev`; in production by
Railway's pre-deploy step):

1. Edit your schema in `src/lib/db/schema.ts`
2. `pnpm db:generate` — writes a new SQL migration into `drizzle/` (review it)
3. Commit the code + the migration and push. Railway runs `scripts/migrate.mjs` before the new release.

`pnpm db:studio` opens Drizzle Studio against this worktree's DB.

## Deploy (Railway)

Builds from the committed `Dockerfile` (`railway.json` → `builder: DOCKERFILE`, chosen over Nixpacks
for a deterministic build); migrations run in `preDeployCommand`; the app starts with
`dotenvx run -- next start` and is health-checked at `/api/health`. Pushing to `main` triggers a
build + deploy. The service needs `DOTENV_PRIVATE_KEY` set; `DATABASE_URL` / `NEXTAUTH_URL` are
Railway service vars.
