import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';
import * as schema from '@/lib/db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// For migrations
export const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });

// For query purposes - only create connection if not in build phase
const queryClient = postgres(process.env.DATABASE_URL, {
  // Disable connection pool during build
  max: process.env.NODE_ENV === 'production' && !process.env.VERCEL ? 1 : undefined,
});
export const db = drizzle(queryClient, { schema });