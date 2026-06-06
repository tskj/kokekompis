import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { deriveDbUrl, worktreeSuffix } from "./db-name.mjs";

// Make the current process point at this worktree's own database, creating + migrating it if needed.
// Reads the base DATABASE_URL from the environment (committed .env.development, loaded by dotenvx),
// derives the per-worktree name, sets it back on process.env, then ensures it exists and is migrated.
// dev.mjs imports this before launching Next; db:migrate:local runs it as a CLI.

const IDENT = /^[A-Za-z0-9_]+$/; // guard the db name before it goes into a non-parameterizable CREATE

async function ensureDatabase(url) {
  const u = new URL(url);
  const dbName = decodeURIComponent(u.pathname.replace(/^\//, ""));
  if (!dbName || !IDENT.test(dbName)) {
    throw new Error(`refusing to ensure unsafe database name: ${JSON.stringify(dbName)}`);
  }
  // Connect to the server's maintenance database to check/create the target.
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const sql = postgres(admin.toString(), { max: 1 });
  try {
    const rows = await sql`select 1 from pg_database where datname = ${dbName}`;
    if (rows.length === 0) {
      await sql.unsafe(`create database "${dbName}"`);
      console.log(`db: created ${dbName}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function runMigrations(url) {
  const sql = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function prepareDb() {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("prepareDb: DATABASE_URL not set");
  const url = deriveDbUrl(base);
  process.env.DATABASE_URL = url;
  const suffix = worktreeSuffix();
  if (suffix) console.log(`db: worktree "${suffix}" → ${new URL(url).pathname.slice(1)}`);
  await ensureDatabase(url);
  await runMigrations(url);
  return url;
}

// Run as a CLI (db:migrate:local).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  prepareDb()
    .then(() => {
      console.log("db: ready");
      process.exit(0);
    })
    .catch((err) => {
      console.error("db: prepare failed —", err);
      process.exit(1);
    });
}
