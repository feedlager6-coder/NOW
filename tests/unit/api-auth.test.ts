import { describe, it, expect } from 'vitest';
import { POST as sendOtp } from '@/app/api/auth/otp/send/route';
import { POST as verifyOtp } from '@/app/api/auth/otp/verify/route';
import { GET as authMe } from '@/app/api/auth/me/route';
import { POST as ageGate } from '@/app/api/onboarding/age-gate/route';
import { GET as getInterests } from '@/app/api/interests/route';

describe('Auth & Onboarding API Endpoints Unit Tests', () => {
  it('should accept dev synthetic phone numbers and reject real/non-test phone numbers', async () => {
    // 1. Valid test phone
    const validReq = new Request('http://localhost:3000/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone: '+79990000025' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const validRes = await sendOtp(validReq);
    const validData = await validRes.json();

    expect(validRes.status).toBe(200);
    expect(validData.success).toBe(true);
    expect(validData.expiresInSeconds).toBe(300);
    expect(validData.devHint).toContain('000000');

    // 2. Reject non-test real phone number
    const nonTestReq = new Request('http://localhost:3000/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone: '+79161234567' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const nonTestRes = await sendOtp(nonTestReq);
    const nonTestData = await nonTestRes.json();

    expect(nonTestRes.status).toBe(400);
    expect(nonTestData.success).toBe(false);
    expect(nonTestData.error).toBe('INVALID_TEST_PHONE');
  });

  it('should reject invalid OTP verification code and require 6 digits', async () => {
    const req = new Request('http://localhost:3000/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone: '+79990000025', code: '123456' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await verifyOtp(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_CODE');
  });

  it('should return unauthenticated status from /api/auth/me when no cookie is present', async () => {
    const res = await authMe();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.authenticated).toBe(false);
    expect(data.user).toBeNull();
  });

  it('should reject unauthenticated request to /api/onboarding/age-gate', async () => {
    const req = new Request('http://localhost:3000/api/onboarding/age-gate', {
      method: 'POST',
      body: JSON.stringify({ birthYear: 2000, birthMonth: 5, consentAccepted: true }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await ageGate(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('should return whitelist interests from /api/interests', async () => {
    const res = await getInterests();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.interests.length).toBe(20);
    expect(data.interests.map((i: any) => i.id)).toContain('walk');
    expect(data.interests.map((i: any) => i.id)).toContain('coffee');
  });
});
