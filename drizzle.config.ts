import { config } from 'dotenv';

// Dev points DATABASE_URL at a local Postgres via the committed .env.development.
// On Railway, DATABASE_URL is injected (this file's config() is a no-op there).
config({ path: '.env.development' });

import { defineConfig } from 'drizzle-kit';
import { deriveDbUrl } from './scripts/db-name.mjs';

// Match the per-worktree database the app uses, so `db:studio` inspects the right one.
const url = deriveDbUrl(process.env.DATABASE_URL ?? '');

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
