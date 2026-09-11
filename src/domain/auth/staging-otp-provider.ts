import crypto from 'crypto';
import { OtpProvider, OtpSendResult, OtpVerifyResult } from './otp-provider';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export class StagingOtpProvider implements OtpProvider {
  public static readonly ALLOWED_PHONE_REGEX = /^\+799900000\d{2}$/;
  private static rateLimitMap = new Map<string, { attempts: number; windowStart: number }>();
  private static readonly MAX_ATTEMPTS_PER_WINDOW = 3;
  private static readonly RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    const env = getEnv();

    if (!env.STAGING_ACCESS_CODE || env.STAGING_ACCESS_CODE.trim() === '') {
      throw new Error('SECURITY VIOLATION: StagingOtpProvider requires STAGING_ACCESS_CODE to be configured.');
    }

    if (!env.STAGING_OTP_CODE || !/^\d{6}$/.test(env.STAGING_OTP_CODE.trim())) {
      throw new Error('SECURITY VIOLATION: StagingOtpProvider requires 6-digit STAGING_OTP_CODE to be configured.');
    }

    if (env.AUTH_MODE === 'staging_gate' && env.NEXT_PUBLIC_STAGING_MODE !== 'true') {
      throw new Error('CONFIGURATION ERROR: AUTH_MODE=staging_gate requires NEXT_PUBLIC_STAGING_MODE=true for UI disclaimer.');
    }
  }

  public async sendOtp(phone: string): Promise<OtpSendResult> {
    const normalizedPhone = phone.trim();

    if (!StagingOtpProvider.ALLOWED_PHONE_REGEX.test(normalizedPhone)) {
      return {
        success: false,
        error: 'INVALID_TEST_PHONE',
        message: 'На закрытом стенде разрешены только тестовые номера вида +799900000XX (где XX от 01 до 99).',
      };
    }

    const now = Date.now();
    const rateData = StagingOtpProvider.rateLimitMap.get(normalizedPhone);

    if (rateData) {
      if (now - rateData.windowStart < StagingOtpProvider.RATE_LIMIT_WINDOW_MS) {
        if (rateData.attempts >= StagingOtpProvider.MAX_ATTEMPTS_PER_WINDOW) {
          logger.warn('staging_otp_rate_limit_exceeded', {
            details: { attempts: rateData.attempts },
          });
          return {
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Слишком много попыток запроса кода. Пожалуйста, подождите 10 минут.',
          };
        }
        rateData.attempts += 1;
      } else {
        StagingOtpProvider.rateLimitMap.set(normalizedPhone, { attempts: 1, windowStart: now });
      }
    } else {
      StagingOtpProvider.rateLimitMap.set(normalizedPhone, { attempts: 1, windowStart: now });
    }

    logger.info('staging_otp_issued', {
      details: {
        devCode: '[REDACTED_STAGING_SECRET]',
        expiresInSeconds: 300,
      },
    });

    return {
      success: true,
      message: 'Код подтверждения стенда выслан (введите 6-значный код закрытого тестирования).',
      expiresInSeconds: 300,
    };
  }

  public async verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
    const normalizedPhone = phone.trim();
    const normalizedCode = (code || '').trim();

    if (!StagingOtpProvider.ALLOWED_PHONE_REGEX.test(normalizedPhone)) {
      return {
        success: false,
        error: 'INVALID_TEST_PHONE',
        message: 'Недопустимый тестовый номер для стенда.',
      };
    }

    // Explicitly reject 000000 in staging!
    if (normalizedCode === '000000') {
      return {
        success: false,
        error: 'INVALID_CODE',
        message: 'Код 000000 отключён на закрытом стенде. Введите выданный код стенда.',
      };
    }

    const env = getEnv();
    const expectedOtp = (env.STAGING_OTP_CODE || '').trim();

    const expectedBuf = Buffer.from(expectedOtp);
    const actualBuf = Buffer.from(normalizedCode);

    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return {
        success: false,
        error: 'INVALID_CODE',
        message: 'Неверный код подтверждения стенда.',
      };
    }

    return {
      success: true,
      message: 'Номер успешно подтверждён на тестовом стенде.',
    };
  }

  public static resetRateLimits(): void {
    StagingOtpProvider.rateLimitMap.clear();
  }
}
