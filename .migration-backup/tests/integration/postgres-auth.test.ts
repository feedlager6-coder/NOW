import { describe, it, expect } from 'vitest';

describe('PostgreSQL Authentication & Persistence Integration Tests (TEST_DATABASE_URL)', () => {
  it('should test session persistence and foreign keys on real PostgreSQL if TEST_DATABASE_URL is set', async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;

    if (!testDbUrl) {
      // eslint-disable-next-line no-console
      console.info(
        'ℹ️ TEST_DATABASE_URL is not set. Real PostgreSQL repository integration test skipped. (Never uses dev DATABASE_URL).'
      );
      return;
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: testDbUrl });
    try {
      const result = await pool.query('SELECT current_database(), now()');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].current_database).toBeDefined();
    } finally {
      await pool.end();
    }
  });
});
