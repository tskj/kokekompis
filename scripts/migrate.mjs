// Apply committed Drizzle migrations. Uses only runtime deps (drizzle-orm + postgres) and plain
// JS, so it runs in Railway's preDeploy container without dev dependencies.
//
// Connection URL: prefer MIGRATE_DATABASE_URL when set (on Railway we point it at the Postgres
// PUBLIC proxy URL — public DNS that resolves immediately in the preDeploy step, before the
// private *.railway.internal network has finished initializing). Otherwise fall back to
// DATABASE_URL (local dev, or anywhere the primary URL is reachable). We also retry on transient
// connection errors so a not-yet-ready network doesn't fail the deploy.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("migrate: no MIGRATE_DATABASE_URL or DATABASE_URL set");
  process.exit(1);
}

const ATTEMPTS = 10;
const DELAY_MS = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isTransient = (err) =>
  /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|CONNECT_TIMEOUT|connect/i.test(
    String(err?.code || err?.message || err),
  );

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  const sql = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    console.log("migrate: ok");
    await sql.end({ timeout: 5 });
    process.exit(0);
  } catch (err) {
    await sql.end({ timeout: 5 }).catch(() => {});
    if (attempt < ATTEMPTS && isTransient(err)) {
      console.warn(`migrate: attempt ${attempt}/${ATTEMPTS} failed (${err.code || err.message}); retrying in ${DELAY_MS}ms`);
      await sleep(DELAY_MS);
      continue;
    }
    console.error("migrate: failed —", err);
    process.exit(1);
  }
}
