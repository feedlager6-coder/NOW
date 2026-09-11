import { describe, it, expect } from 'vitest';
import { SessionService } from '@/domain/auth/session-service';

describe('SessionService & Cookie Config Unit Tests', () => {
  it('should set secure: false for localhost development', () => {
    const origEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'development';
      const expires = new Date(Date.now() + 3600 * 1000);
      const opts = SessionService.getSessionCookieOptions(expires);

      expect(opts.name).toBe('now_session');
      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe('lax');
      expect(opts.secure).toBe(false); // Valid for http://localhost:3000
      expect(opts.path).toBe('/');
      expect(opts.expires).toBe(expires);
    } finally {
      (process.env as any).NODE_ENV = origEnv;
    }
  });

  it('should set secure: true for production HTTPS requirement', () => {
    const origEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      const expires = new Date(Date.now() + 3600 * 1000);
      const opts = SessionService.getSessionCookieOptions(expires);

      expect(opts.secure).toBe(true); // Required in production
      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe('lax');
    } finally {
      (process.env as any).NODE_ENV = origEnv;
    }
  });

  it('should generate secure 32-byte session tokens and compute SHA-256 hash', () => {
    const { rawToken, tokenHash } = SessionService.generateSessionToken();

    expect(rawToken.length).toBe(64); // 32 bytes hex
    expect(tokenHash.length).toBe(64); // sha256 hex
    expect(SessionService.hashToken(rawToken)).toBe(tokenHash);
  });

  it('should compute deterministic phone lookup HMAC without saving phone', () => {
    const secret = 'test-secret-salt-key-1234567890';
    const hash1 = SessionService.computePhoneLookupHash('+79990000001', secret);
    const hash2 = SessionService.computePhoneLookupHash('+79990000001', secret);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
