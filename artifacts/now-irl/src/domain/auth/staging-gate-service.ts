import crypto from 'crypto';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface StagingGateVerificationResult {
  success: boolean;
  error?: string;
  message?: string;
  token?: string;
}

export class StagingGateService {
  public static readonly COOKIE_NAME = 'now_staging_gate';
  public static readonly COOKIE_MAX_AGE_SECONDS = 3600; // 1 hour
  private static rateLimitMap = new Map<string, { attempts: number; windowStart: number }>();
  private static readonly MAX_ATTEMPTS_PER_WINDOW = 5;
  private static readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  public static verifyAccessCode(
    providedCode: string,
    clientIdentifier = 'default_client'
  ): StagingGateVerificationResult {
    const env = getEnv();

    if (!env.STAGING_ACCESS_CODE || env.STAGING_ACCESS_CODE.trim() === '') {
      logger.error('staging_gate_misconfigured', {
        safeErrorCode: 'STAGING_ACCESS_CODE_MISSING',
      });
      return {
        success: false,
        error: 'CONFIG_ERROR',
        message: 'Staging access gate is not configured on this server.',
      };
    }

    const now = Date.now();

    // Periodic sweep of expired rate limit entries
    if (this.rateLimitMap.size > 100) {
      for (const [key, data] of this.rateLimitMap.entries()) {
        if (now - data.windowStart >= this.RATE_LIMIT_WINDOW_MS) {
          this.rateLimitMap.delete(key);
        }
      }
    }

    const rateData = this.rateLimitMap.get(clientIdentifier);
    if (rateData) {
      if (now - rateData.windowStart < this.RATE_LIMIT_WINDOW_MS) {
        if (rateData.attempts >= this.MAX_ATTEMPTS_PER_WINDOW) {
          logger.warn('staging_gate_rate_limited', {
            details: { attempts: rateData.attempts },
          });
          return {
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Слишком много попыток ввода кода. Подождите 15 минут.',
          };
        }
        rateData.attempts += 1;
      } else {
        this.rateLimitMap.set(clientIdentifier, { attempts: 1, windowStart: now });
      }
    } else {
      this.rateLimitMap.set(clientIdentifier, { attempts: 1, windowStart: now });
    }

    const expectedBuffer = Buffer.from(env.STAGING_ACCESS_CODE.trim());
    const providedBuffer = Buffer.from((providedCode || '').trim());

    if (expectedBuffer.length !== providedBuffer.length) {
      return {
        success: false,
        error: 'INVALID_ACCESS_CODE',
        message: 'Неверный код доступа к закрытому тестированию.',
      };
    }

    const match = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    if (!match) {
      return {
        success: false,
        error: 'INVALID_ACCESS_CODE',
        message: 'Неверный код доступа к закрытому тестированию.',
      };
    }

    this.rateLimitMap.delete(clientIdentifier);
    const token = this.generateGateToken();

    return {
      success: true,
      message: 'Доступ к стенду подтверждён.',
      token,
    };
  }

  public static generateGateToken(): string {
    const env = getEnv();
    const secret = env.SESSION_SECRET;
    const payload = JSON.stringify({ v: 1, ts: Date.now() });
    const payloadBase64 = Buffer.from(payload).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
    return payloadBase64 + '.' + signature;
  }

  public static verifyGateToken(token?: string | null): boolean {
    if (!token || typeof token !== 'string') return false;

    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [payloadBase64, signature] = parts;
    const env = getEnv();
    const secret = env.SESSION_SECRET;

    const expectedSig = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
    const expectedBuf = Buffer.from(expectedSig);
    const actualBuf = Buffer.from(signature);

    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return false;
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
      const ageMs = Date.now() - (payload.ts || 0);
      return ageMs >= 0 && ageMs <= this.COOKIE_MAX_AGE_SECONDS * 1000;
    } catch {
      return false;
    }
  }

  public static resetRateLimits(): void {
    this.rateLimitMap.clear();
  }
}
