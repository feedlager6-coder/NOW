import { describe, it, expect, vi } from 'vitest';
import * as dbModule from '@/db';
import { GET } from '@/app/api/health/route';

describe('GET /api/health Endpoint Tests', () => {
  it('should return 200 OK and healthy status when database ping succeeds', async () => {
    // Mock getDbPool to simulate healthy database connection
    const mockQuery = vi.fn().mockResolvedValue({ rows: [{ ping: 1 }] });
    vi.spyOn(dbModule, 'getDbPool').mockReturnValue({
      query: mockQuery,
    } as unknown as ReturnType<typeof dbModule.getDbPool>);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
    expect(data.mode).toBe('DEMO_MODE');
    expect(data.timestamp).toBeDefined();

    // Verify no secret leak
    expect(JSON.stringify(data)).not.toContain('postgres');
    expect(JSON.stringify(data)).not.toContain('DATABASE_URL');
  });

  it('should return 503 Service Unavailable without leaking stack trace when database is down', async () => {
    // Mock getDbPool to simulate database outage
    const mockQuery = vi.fn().mockRejectedValue(new Error('Connection refused to 127.0.0.1:5432'));
    vi.spyOn(dbModule, 'getDbPool').mockReturnValue({
      query: mockQuery,
    } as unknown as ReturnType<typeof dbModule.getDbPool>);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.database).toBe('disconnected');
    expect(data.correlationId).toBeDefined();
    expect(data.error).toBe('Database service is currently unreachable');

    // Strict security check: do NOT leak host, port, credentials or stack trace to client!
    expect(JSON.stringify(data)).not.toContain('127.0.0.1');
    expect(JSON.stringify(data)).not.toContain('5432');
    expect(JSON.stringify(data)).not.toContain('Connection refused');
    expect(data.stack).toBeUndefined();
  });
});
