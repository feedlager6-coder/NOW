import { describe, it, expect, vi } from 'vitest';
import { redactPii, logger } from '@/lib/logger';

describe('Zero-PII Logger Redaction Tests', () => {
  it('should redact sensitive keys according to strict PII denylist', () => {
    const sensitivePayload = {
      phone: '+79991234567',
      phoneNumber: '+7 (999) 123-45-67',
      email: 'user@example.com',
      password: 'super_secret_password',
      otp: '123456',
      token: 'jwt.token.secret',
      tokenHash: 'hashed_token_value',
      body: 'This is private chat message text that must never be logged',
      description: 'Harassment report text with personal details',
      approximateLat: '42.983000',
      approximateLng: '47.504000',
      cardNumber: '4242424242424242',
      cvv: '123',
      passport: '4510 123456',
      document: 'passport_scan.png',
      // Non-sensitive technical data that SHOULD be preserved:
      actorId: 'usr_12345',
      resourceId: 'bk_67890',
      action: 'booking_created',
      status: 'pending',
    };

    const redacted = redactPii(sensitivePayload);

    // Assert that every sensitive field is replaced with '[REDACTED]'
    expect(redacted.phone).toBe('[REDACTED]');
    expect(redacted.phoneNumber).toBe('[REDACTED]');
    expect(redacted.email).toBe('[REDACTED]');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.otp).toBe('[REDACTED]');
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.tokenHash).toBe('[REDACTED]');
    expect(redacted.body).toBe('[REDACTED]');
    expect(redacted.description).toBe('[REDACTED]');
    expect(redacted.approximateLat).toBe('[REDACTED]');
    expect(redacted.approximateLng).toBe('[REDACTED]');
    expect(redacted.cardNumber).toBe('[REDACTED]');
    expect(redacted.cvv).toBe('[REDACTED]');
    expect(redacted.passport).toBe('[REDACTED]');
    expect(redacted.document).toBe('[REDACTED]');

    // Assert non-sensitive technical metadata is untouched
    expect(redacted.actorId).toBe('usr_12345');
    expect(redacted.resourceId).toBe('bk_67890');
    expect(redacted.action).toBe('booking_created');
    expect(redacted.status).toBe('pending');
  });

  it('should redact regex patterns for phone numbers and emails inside strings', () => {
    const rawStringObject = {
      freeformLog: 'User called +7 999 123 45 67 and email was test@moodcall.app with Bearer eyJhbGciOi...',
    };

    const sanitized = redactPii(rawStringObject);
    expect(sanitized.freeformLog).toContain('[PHONE_REDACTED]');
    expect(sanitized.freeformLog).toContain('[EMAIL_REDACTED]');
    expect(sanitized.freeformLog).toContain('Bearer [REDACTED]');
  });

  it('should output structured log with correlationId and without leaking unredacted data', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logResult = logger.info('user_action', {
      correlationId: 'req_test_001',
      actorId: 'usr_abc',
      resourceId: 'res_xyz',
      details: {
        safeMetric: 42,
        secretCode: '999999',
      },
    });

    expect(logResult.event).toBe('user_action');
    expect(logResult.level).toBe('info');
    expect(logResult.correlationId).toBe('req_test_001');
    expect(logResult.actorId).toBe('usr_abc');
    expect(logResult.details?.safeMetric).toBe(42);
    expect(logResult.details?.secretCode).toBe('[REDACTED]');

    consoleSpy.mockRestore();
  });
});
