import { describe, it, expect, vi } from 'vitest';
import * as envModule from '@/lib/env';
import { runSeed } from '@/db/seed';

describe('Database Seed Safety Guard Tests', () => {
  it('should throw an error and refuse to seed when NODE_ENV is production', async () => {
    vi.spyOn(envModule, 'getEnv').mockReturnValue({
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/now_irl',
      SESSION_SECRET: 'test_session_secret_32_bytes_long',
      OTP_HMAC_SECRET: 'test_otp_secret_32_bytes_long_here',
      OTP_PROVIDER: 'mock',
      STORAGE_PROVIDER: 'mock',
      MAP_PROVIDER: 'mock',
      EMERGENCY_PHONE_URL: 'tel:112',
      CHAT_RETENTION_HOURS: 12,
      NEXT_PUBLIC_ENABLE_DEMO_MODE: 'true',
      NEXT_PUBLIC_DEMO_MODE: 'true',
    });

    await expect(runSeed()).rejects.toThrow(
      'FATAL: Seed execution is strictly prohibited when NODE_ENV=production'
    );
  });
});
