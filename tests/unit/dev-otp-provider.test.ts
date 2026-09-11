import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DevOtpProvider } from '@/infrastructure/auth/dev-otp-provider';

describe('DevOtpProvider Unit Tests', () => {
  beforeEach(() => {
    DevOtpProvider.resetRateLimits();
  });

  afterEach(() => {
    DevOtpProvider.resetRateLimits();
  });

  it('should accept only numbers from the allowed test range +799900000XX', async () => {
    const provider = new DevOtpProvider();

    // Valid test numbers
    const valid1 = await provider.sendOtp('+79990000001');
    expect(valid1.success).toBe(true);

    const valid2 = await provider.sendOtp('+79990000099');
    expect(valid2.success).toBe(true);

    // Invalid non-test numbers
    const invalid1 = await provider.sendOtp('+79991234567');
    expect(invalid1.success).toBe(false);
    expect(invalid1.error).toBe('INVALID_TEST_PHONE');

    const invalid2 = await provider.sendOtp('+79161234567');
    expect(invalid2.success).toBe(false);
    expect(invalid2.error).toBe('INVALID_TEST_PHONE');
  });

  it('should verify fixed dev code 000000 and reject any other code', async () => {
    const provider = new DevOtpProvider();
    const phone = '+79990000015';

    await provider.sendOtp(phone);

    // Wrong code
    const wrong = await provider.verifyOtp(phone, '123456');
    expect(wrong.success).toBe(false);
    expect(wrong.error).toBe('INVALID_CODE');

    // Correct fixed code
    const ok = await provider.verifyOtp(phone, '000000');
    expect(ok.success).toBe(true);
  });

  it('should enforce rate limiting after 3 requests in window', async () => {
    const provider = new DevOtpProvider();
    const phone = '+79990000020';

    expect((await provider.sendOtp(phone)).success).toBe(true);
    expect((await provider.sendOtp(phone)).success).toBe(true);
    expect((await provider.sendOtp(phone)).success).toBe(true);

    // 4th request must be rate limited
    const fourth = await provider.sendOtp(phone);
    expect(fourth.success).toBe(false);
    expect(fourth.error).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should throw fatal security error if instantiated in production environment', () => {
    const origEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      expect(() => new DevOtpProvider()).toThrow(/SECURITY VIOLATION.*production/);
    } finally {
      (process.env as any).NODE_ENV = origEnv;
    }
  });
});
