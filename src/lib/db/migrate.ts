import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { migrationClient, db } from './';

async function runMigrations() {
  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrations completed successfully.');
  // Close the connection, otherwise the script will hang
  await migrationClient.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});