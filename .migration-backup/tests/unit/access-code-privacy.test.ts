import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as stagingGatePost } from '@/app/api/auth/staging-gate/route';
import { StagingGateService } from '@/domain/auth/staging-gate-service';
import { logger } from '@/lib/logger';
import { resetEnvCache } from '@/lib/env';

describe('Access Code & Staging Gate Privacy & Security Tests', () => {
  const originalEnv = { ...process.env };
  const TEST_SECRET_ACCESS_CODE = 'ULTRA_SECRET_STAGING_KEY_98765';

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete (process.env as any)[key];
      }
    }
    Object.assign(process.env, originalEnv);
    (process.env as any).NODE_ENV = 'production';
    process.env.AUTH_MODE = 'staging_gate';
    process.env.NEXT_PUBLIC_STAGING_MODE = 'true';
    process.env.STAGING_ACCESS_CODE = TEST_SECRET_ACCESS_CODE;
    process.env.STAGING_OTP_CODE = '765432';
    process.env.SESSION_SECRET = '0123456789abcdef0123456789abcdef';
    resetEnvCache();
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
    vi.restoreAllMocks();
  });

  it('should only accept access code via POST body and never return it in the JSON response', async () => {
    const req = new Request('http://localhost:3000/api/auth/staging-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: TEST_SECRET_ACCESS_CODE }),
    });

    const res = await stagingGatePost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify response body does NOT leak access code or token
    const rawJson = JSON.stringify(data);
    expect(rawJson).not.toContain(TEST_SECRET_ACCESS_CODE);
    expect(data.accessCode).toBeUndefined();
    expect(data.token).toBeUndefined(); // Token must only be in httpOnly cookie, not in JSON body!
  });

  it('should issue httpOnly cookie and ensure cookie cannot be read via client-side scripts', async () => {
    const req = new Request('http://localhost:3000/api/auth/staging-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: TEST_SECRET_ACCESS_CODE }),
    });

    const res = await stagingGatePost(req);
    const cookieHeader = res.headers.get('set-cookie');

    expect(cookieHeader).toBeDefined();
    expect(cookieHeader).toContain('now_staging_gate=');
    expect(cookieHeader).toMatch(/httponly/i);
    expect(cookieHeader).toMatch(/samesite=lax/i);
    expect(cookieHeader).toMatch(/path=\//i);
  });

  it('should never leak STAGING_ACCESS_CODE or submitted codes in error responses', async () => {
    const submittedWrongCode = 'ATTACKER_GUESS_99999';
    const req = new Request('http://localhost:3000/api/auth/staging-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: submittedWrongCode }),
    });

    const res = await stagingGatePost(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);

    const rawErrorJson = JSON.stringify(data);
    expect(rawErrorJson).not.toContain(TEST_SECRET_ACCESS_CODE);
    expect(rawErrorJson).not.toContain(submittedWrongCode);
  });

  it('should never log STAGING_ACCESS_CODE or provided code into logger', () => {
    const warnSpy = vi.spyOn(logger, 'warn');
    const errorSpy = vi.spyOn(logger, 'error');
    const infoSpy = vi.spyOn(logger, 'info');

    // Attempt 1: wrong code
    StagingGateService.verifyAccessCode('WRONG_LEAK_PROBE_CODE');

    // Attempt 2: correct code
    StagingGateService.verifyAccessCode(TEST_SECRET_ACCESS_CODE);

    const allLoggedArgs = [
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
      ...infoSpy.mock.calls,
    ].map((call) => JSON.stringify(call));

    for (const logItem of allLoggedArgs) {
      expect(logItem).not.toContain(TEST_SECRET_ACCESS_CODE);
      expect(logItem).not.toContain('WRONG_LEAK_PROBE_CODE');
    }
  });

  it('should use neutral ephemeral rate limit key and never store or log raw x-forwarded-for', async () => {
    const rawIp = '203.0.113.195';
    const warnSpy = vi.spyOn(logger, 'warn');

    // Trigger rate limit attempts with raw IP in header
    for (let i = 0; i < 6; i++) {
      const req = new Request('http://localhost:3000/api/auth/staging-gate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': rawIp,
        },
        body: JSON.stringify({ accessCode: 'bad_code' }),
      });
      await stagingGatePost(req);
    }

    const allLoggedArgs = warnSpy.mock.calls.map((call) => JSON.stringify(call));
    for (const logItem of allLoggedArgs) {
      // Assert raw IP is NEVER logged
      expect(logItem).not.toContain(rawIp);
    }
  });

  it('should ensure gate token payload contains only version and timestamp, never access code', () => {
    const token = StagingGateService.generateGateToken();
    expect(token).toBeDefined();

    const [payloadBase64] = token.split('.');
    const decodedPayload = Buffer.from(payloadBase64, 'base64url').toString('utf-8');

    expect(decodedPayload).not.toContain(TEST_SECRET_ACCESS_CODE);
    const parsed = JSON.parse(decodedPayload);
    expect(parsed.v).toBe(1);
    expect(typeof parsed.ts).toBe('number');
  });
});
