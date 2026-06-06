import { spawn } from "node:child_process";
import { prepareDb } from "./worktree-db.mjs";

// `pnpm dev`: point this worktree at its own (auto-created, auto-migrated) database, then start Next.
// dotenvx has already loaded .env.development + the encrypted .env into process.env; prepareDb() derives
// the per-worktree DATABASE_URL and sets it back, and Next inherits it (real env vars beat .env files).

await prepareDb();

const args = process.argv.slice(2); // forward e.g. `pnpm dev -p 3010`
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--turbopack", ...args],
  { stdio: "inherit", env: process.env },
);
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
