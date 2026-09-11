import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { getEnv } from '@/lib/env';

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const env = getEnv();
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 1000,
    });
  }
  return pool;
}

export function getDb() {
  if (!dbInstance) {
    const currentPool = getDbPool();
    dbInstance = drizzle(currentPool, { schema });
  }
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const instance = getDb();
    return Reflect.get(instance, prop);
  },
});
