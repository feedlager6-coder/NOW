import { describe, it, expect } from 'vitest';
import { envSchema } from '@/lib/env';

describe('Environment Variables Zod Schema Tests for NOW / IRL', () => {
  it('should parse valid environment with defaults', () => {
    const valid = {
      NODE_ENV: 'development',
      PORT: '3000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/now_irl?sslmode=prefer',
    };

    const parsed = envSchema.parse(valid);
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.PORT).toBe(3000);
    expect(parsed.OTP_PROVIDER).toBe('mock');
    expect(parsed.STORAGE_PROVIDER).toBe('mock');
    expect(parsed.MAP_PROVIDER).toBe('mock');
    expect(parsed.EMERGENCY_PHONE_URL).toBe('tel:112');
    expect(parsed.CHAT_RETENTION_HOURS).toBe(12);
    expect(parsed.NEXT_PUBLIC_ENABLE_DEMO_MODE).toBe('true');
  });

  it('should fail if invalid NODE_ENV is provided', () => {
    const invalid = {
      NODE_ENV: 'invalid_stage',
    };

    const result = envSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
