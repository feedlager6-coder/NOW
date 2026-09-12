import { NextResponse } from 'next/server';
import { getDbPool } from '@/db';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function GET() {
  const correlationId = crypto.randomUUID();
  const env = getEnv();

  try {
    const pool = getDbPool();
    // Non-leaking simple ping
    const res = await pool.query('SELECT 1 as ping');
    if (!res || !res.rows || res.rows.length === 0) {
      throw new Error('Database ping returned empty result');
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: env.NODE_ENV,
        mode: 'DEMO_MODE',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';

    // Safe server-side log only with correlation ID
    logger.error('healthcheck_db_failure', {
      correlationId,
      safeErrorCode: 'DB_CONNECTION_FAILED',
      details: { reason: errorMessage },
    });

    // Return safe, sanitized response to client WITHOUT stack trace or connection strings
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        correlationId,
        error: 'Database service is currently unreachable',
      },
      { status: 503 }
    );
  }
}
