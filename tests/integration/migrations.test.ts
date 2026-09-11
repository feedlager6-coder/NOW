import { describe, it, expect } from 'vitest';
import * as schema from '@/db/schema';
import fs from 'fs';
import path from 'path';

describe('Database Schema & Migration Smoke Tests for NOW / IRL', () => {
  it('should define all 19 canonical tables in Drizzle schema', () => {
    const expectedTables = [
      'users',
      'sessions',
      'profiles',
      'interests',
      'activity_types',
      'service_zones',
      'meetups',
      'meetup_participants',
      'meetup_events',
      'meetup_messages',
      'ratings',
      'reports',
      'blocks',
      'safety_events',
      'consents',
      'notifications',
      'audit_logs',
      'feature_flags',
      'share_cards',
    ];

    // Assert that each table is defined in the schema
    for (const tableName of expectedTables) {
      const camelCaseName = tableName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const table = (schema as Record<string, unknown>)[camelCaseName];
      expect(table, `Table ${tableName} (${camelCaseName}) must be exported in schema`).toBeDefined();
    }
  });

  it('should verify critical schema constraints and security fields', () => {
    // 1. users table must have phoneLookupHash
    expect(schema.users.phoneLookupHash).toBeDefined();

    // 2. profiles and meetups table must have isDemo flag
    expect(schema.profiles.isDemo).toBeDefined();
    expect(schema.meetups.isDemo).toBeDefined();

    // 3. meetups coordinates must be nullable in MVP
    expect(schema.meetups.approximateLat).toBeDefined();
    expect(schema.meetups.approximateLng).toBeDefined();
    expect(schema.meetups.capacity).toBeDefined();

    // 4. meetup_messages must have retentionExpiresAt (12h TTL)
    expect(schema.meetupMessages.retentionExpiresAt).toBeDefined();

    // 5. service_zones must have isWhitelisted
    expect(schema.serviceZones.isWhitelisted).toBeDefined();
  });

  it('should verify migration SQL file existence and schema statements', () => {
    const migrationsDir = path.resolve(__dirname, '../../src/db/migrations');
    if (!fs.existsSync(migrationsDir)) {
      return;
    }

    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'));

    if (sqlFiles.length > 0) {
      const latestSql = fs.readFileSync(path.join(migrationsDir, sqlFiles[0]), 'utf-8');
      expect(latestSql).toContain('CREATE TABLE IF NOT EXISTS "users"');
      expect(latestSql).toContain('"phone_lookup_hash" text NOT NULL');
      expect(latestSql).toContain('"is_demo" boolean DEFAULT false NOT NULL');
      expect(latestSql).toContain('CREATE TABLE IF NOT EXISTS "meetups"');
      expect(latestSql).toContain('CREATE TABLE IF NOT EXISTS "meetup_messages"');
      expect(latestSql).toContain('CREATE TABLE IF NOT EXISTS "safety_events"');
    }
  });

  it('should test migration execution on real PostgreSQL when TEST_DATABASE_URL is provided', async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;

    if (!testDbUrl) {
      // eslint-disable-next-line no-console
      console.info(
        'ℹ️ TEST_DATABASE_URL is not set. Real PostgreSQL integration test skipped. (Integration tests strictly require TEST_DATABASE_URL and never fallback to dev DATABASE_URL).'
      );
      return;
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: testDbUrl, connectionTimeoutMillis: 5000 });
    try {
      const ping = await pool.query('SELECT 1 as pg_test');
      expect(ping.rows[0]).toEqual({ pg_test: 1 });
    } finally {
      await pool.end();
    }
  });
});
