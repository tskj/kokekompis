// Apply committed Drizzle migrations. Uses only runtime deps (drizzle-orm + postgres) and plain
// JS, so it runs in Railway's preDeploy container without dev dependencies. Reads DATABASE_URL
// from the environment (injected by Railway; provided via dotenvx/.env.local locally).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("migrate: DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("migrate: ok");
} catch (err) {
  console.error("migrate: failed —", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
