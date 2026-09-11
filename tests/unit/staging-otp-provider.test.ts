import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DevOtpProvider } from '@/infrastructure/auth/dev-otp-provider';
import { StagingOtpProvider } from '@/domain/auth/staging-otp-provider';
import { StagingGateService } from '@/domain/auth/staging-gate-service';
import { getActiveOtpProvider } from '@/infrastructure/auth/otp-factory';
import { resetEnvCache } from '@/lib/env';

describe('Staging vs Dev Auth Security Isolation Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete (process.env as any)[key];
      }
    }
    Object.assign(process.env, originalEnv);
    resetEnvCache();
    DevOtpProvider.resetRateLimits();
    StagingOtpProvider.resetRateLimits();
    StagingGateService.resetRateLimits();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete (process.env as any)[key];
      }
    }
    Object.assign(process.env, originalEnv);
    resetEnvCache();
  });

  describe('DevOtpProvider Production Guard', () => {
    it('should throw fatal security violation when instantiated in NODE_ENV=production', () => {
      (process.env as any).NODE_ENV = 'production';
      resetEnvCache();
      expect(() => new DevOtpProvider()).toThrow(/SECURITY VIOLATION.*production/i);
    });

    it('should work cleanly in NODE_ENV=development or test', () => {
      (process.env as any).NODE_ENV = 'development';
      resetEnvCache();
      const provider = new DevOtpProvider();
      expect(provider).toBeInstanceOf(DevOtpProvider);
    });
  });

  describe('StagingOtpProvider Configuration & Safety Guards', () => {
    it('should throw if STAGING_ACCESS_CODE is missing or empty', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.AUTH_MODE = 'staging_gate';
      process.env.NEXT_PUBLIC_STAGING_MODE = 'true';
      delete process.env.STAGING_ACCESS_CODE;
      process.env.STAGING_OTP_CODE = '654321';
      resetEnvCache();

      expect(() => new StagingOtpProvider()).toThrow(/STAGING_ACCESS_CODE/i);
    });

    it('should throw if STAGING_OTP_CODE is missing or not a 6-digit code', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.AUTH_MODE = 'staging_gate';
      process.env.NEXT_PUBLIC_STAGING_MODE = 'true';
      process.env.STAGING_ACCESS_CODE = 'VALID_SECRET_GATE_123';
      process.env.STAGING_OTP_CODE = '123'; // invalid length
      resetEnvCache();

      expect(() => new StagingOtpProvider()).toThrow(/STAGING_OTP_CODE/i);
    });

    it('should throw if AUTH_MODE=staging_gate but NEXT_PUBLIC_STAGING_MODE is not true', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.AUTH_MODE = 'staging_gate';
      process.env.NEXT_PUBLIC_STAGING_MODE = 'false';
      process.env.STAGING_ACCESS_CODE = 'VALID_SECRET_GATE_123';
      process.env.STAGING_OTP_CODE = '654321';
      resetEnvCache();

      expect(() => new StagingOtpProvider()).toThrow(/NEXT_PUBLIC_STAGING_MODE/i);
    });
  });

  describe('StagingGateService Access Code & Token Handling', () => {
    it('should reject invalid access code and grant access for correct code', () => {
      process.env.STAGING_ACCESS_CODE = 'SUPER_SECRET_STAGING_GATE_2026';
      process.env.SESSION_SECRET = '0123456789abcdef0123456789abcdef';
      resetEnvCache();

      // 1. Wrong code -> rejected
      const failure = StagingGateService.verifyAccessCode('wrong_guess');
      expect(failure.success).toBe(false);
      expect(failure.error).toBe('INVALID_ACCESS_CODE');
      expect(failure.token).toBeUndefined();

      // 2. Correct code -> accepted and token issued
      const success = StagingGateService.verifyAccessCode('SUPER_SECRET_STAGING_GATE_2026');
      expect(success.success).toBe(true);
      expect(success.token).toBeDefined();

      // 3. Token validates properly
      const isValid = StagingGateService.verifyGateToken(success.token);
      expect(isValid).toBe(true);

      // 4. Tampered token rejected
      expect(StagingGateService.verifyGateToken('invalid.tampered.token')).toBe(false);
    });

    it('should enforce rate limiting after repeated failed access attempts', () => {
      process.env.STAGING_ACCESS_CODE = 'CORRECT_SECRET';
      resetEnvCache();
      const clientId = 'tester_ip_123';

      for (let i = 0; i < 5; i++) {
        StagingGateService.verifyAccessCode('bad_code', clientId);
      }

      // 6th attempt must trigger rate limit
      const blocked = StagingGateService.verifyAccessCode('bad_code', clientId);
      expect(blocked.success).toBe(false);
      expect(blocked.error).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('StagingOtpProvider OTP Logic & 000000 Rejection', () => {
    const validTestPhone = '+79990000001';
    const invalidPhone = '+79991234567';

    beforeEach(() => {
      (process.env as any).NODE_ENV = 'production';
      process.env.AUTH_MODE = 'staging_gate';
      process.env.NEXT_PUBLIC_STAGING_MODE = 'true';
      process.env.STAGING_ACCESS_CODE = 'STAGE_ACCESS_999';
      process.env.STAGING_OTP_CODE = '839201';
      resetEnvCache();
    });

    it('should reject non-test phone numbers', async () => {
      const provider = new StagingOtpProvider();
      const sendRes = await provider.sendOtp(invalidPhone);
      expect(sendRes.success).toBe(false);
      expect(sendRes.error).toBe('INVALID_TEST_PHONE');
    });

    it('should NEVER accept fixed dev code 000000 in StagingOtpProvider', async () => {
      const provider = new StagingOtpProvider();
      const verifyRes = await provider.verifyOtp(validTestPhone, '000000');
      expect(verifyRes.success).toBe(false);
      expect(verifyRes.error).toBe('INVALID_CODE');
      expect(verifyRes.message).toContain('000000 отключён');
    });

    it('should verify strictly against STAGING_OTP_CODE', async () => {
      const provider = new StagingOtpProvider();

      // Wrong code
      const fail = await provider.verifyOtp(validTestPhone, '111111');
      expect(fail.success).toBe(false);
      expect(fail.error).toBe('INVALID_CODE');

      // Exact match with STAGING_OTP_CODE
      const success = await provider.verifyOtp(validTestPhone, '839201');
      expect(success.success).toBe(true);
      expect(success.message).toContain('успешно');
    });
  });

  describe('Active OTP Factory Routing', () => {
    it('should return StagingOtpProvider when AUTH_MODE=staging_gate', () => {
      process.env.AUTH_MODE = 'staging_gate';
      process.env.NEXT_PUBLIC_STAGING_MODE = 'true';
      process.env.STAGING_ACCESS_CODE = 'SECRET_123';
      process.env.STAGING_OTP_CODE = '123456';
      resetEnvCache();

      const provider = getActiveOtpProvider();
      expect(provider).toBeInstanceOf(StagingOtpProvider);
    });

    it('should fail-closed if AUTH_MODE=dev_otp in production', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.AUTH_MODE = 'dev_otp';
      resetEnvCache();

      expect(() => getActiveOtpProvider()).toThrow(/SECURITY VIOLATION/);
    });
  });
});
