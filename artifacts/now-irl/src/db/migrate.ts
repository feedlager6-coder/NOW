import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDbPool } from './index';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getEnv } from '@/lib/env';
import path from 'path';

import { Pool } from 'pg';

export async function runMigrations(customDbUrl?: string) {
  const env = getEnv();
  const connectionString = customDbUrl || env.DATABASE_URL;
  const pool = customDbUrl ? new Pool({ connectionString: customDbUrl }) : getDbPool();
  const db = drizzle(pool);

  // eslint-disable-next-line no-console
  console.log(`🚀 Executing database migrations on: ${connectionString.replace(/:[^:@]+@/, ':***@')}...`);

  const migrationsFolder = path.resolve(__dirname, './migrations');
  await migrate(db, { migrationsFolder });

  // eslint-disable-next-line no-console
  console.log('✅ Migrations successfully applied.');
}

if (require.main === module || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
