import { OtpProvider, OtpSendResult, OtpVerifyResult } from '@/domain/auth/otp-provider';
import { logger } from '@/lib/logger';

export class DevOtpProvider implements OtpProvider {
  private static rateLimitMap = new Map<string, { attempts: number; windowStart: number }>();
  public static readonly ALLOWED_PHONE_REGEX = /^\+799900000\d{2}$/;
  public static readonly DEV_CODE = '000000';
  private static readonly MAX_ATTEMPTS_PER_WINDOW = 3;
  private static readonly RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY VIOLATION: DevOtpProvider cannot be instantiated in production environment!');
    }
  }

  public async sendOtp(phone: string): Promise<OtpSendResult> {
    const normalizedPhone = phone.trim();

    if (!DevOtpProvider.ALLOWED_PHONE_REGEX.test(normalizedPhone)) {
      return {
        success: false,
        error: 'INVALID_TEST_PHONE',
        message: 'В dev-режиме разрешены только тестовые номера вида +799900000XX (где XX от 01 до 99).',
      };
    }

    // Check rate limit
    const now = Date.now();
    const rateData = DevOtpProvider.rateLimitMap.get(normalizedPhone);

    if (rateData) {
      if (now - rateData.windowStart < DevOtpProvider.RATE_LIMIT_WINDOW_MS) {
        if (rateData.attempts >= DevOtpProvider.MAX_ATTEMPTS_PER_WINDOW) {
          logger.warn('otp_rate_limit_exceeded', {
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
        // Reset window
        DevOtpProvider.rateLimitMap.set(normalizedPhone, { attempts: 1, windowStart: now });
      }
    } else {
      DevOtpProvider.rateLimitMap.set(normalizedPhone, { attempts: 1, windowStart: now });
    }

    logger.info('dev_otp_issued', {
      details: {
        devCode: '[REDACTED_DEV_FIXED]',
        expiresInSeconds: 300,
      },
    });

    return {
      success: true,
      message: 'Код подтверждения отправлен (в Development режиме используйте: 000000).',
      expiresInSeconds: 300,
    };
  }

  public async verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
    const normalizedPhone = phone.trim();
    const normalizedCode = code.trim();

    if (!DevOtpProvider.ALLOWED_PHONE_REGEX.test(normalizedPhone)) {
      return {
        success: false,
        error: 'INVALID_TEST_PHONE',
        message: 'Недопустимый тестовый номер.',
      };
    }

    if (normalizedCode !== DevOtpProvider.DEV_CODE) {
      return {
        success: false,
        error: 'INVALID_CODE',
        message: 'Неверный код подтверждения. Введите 000000.',
      };
    }

    return {
      success: true,
      message: 'Номер успешно подтверждён.',
    };
  }

  public static resetRateLimits(): void {
    DevOtpProvider.rateLimitMap.clear();
  }
}

let devOtpInstance: DevOtpProvider | null = null;
export function getDevOtpProvider(): DevOtpProvider {
  if (!devOtpInstance) {
    devOtpInstance = new DevOtpProvider();
  }
  return devOtpInstance;
}

export const devOtpProvider = new Proxy({} as DevOtpProvider, {
  get(_target, prop) {
    const instance = getDevOtpProvider();
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});
