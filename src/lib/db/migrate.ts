import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrationClient } from '@/lib/db';

async function runMigrations() {
  console.log('Running database migrations...');
  const migrationDb = drizzle(migrationClient);
  await migrate(migrationDb, { migrationsFolder: 'drizzle' });
  console.log('Migrations completed successfully.');
  // Close the connection, otherwise the script will hang
  await migrationClient.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});