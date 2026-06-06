import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

// Env is provided by dotenvx (`pnpm dev` / `pnpm start`) or injected by Railway — nothing is loaded
// from the encrypted `.env` here. Migrations run via scripts/migrate.mjs, not from this module.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const queryClient = postgres(process.env.DATABASE_URL, {
  // Single connection in production (and not on Vercel); a pool locally.
  max: process.env.NODE_ENV === 'production' && !process.env.VERCEL ? 1 : undefined,
});
export const db = drizzle(queryClient, { schema });
