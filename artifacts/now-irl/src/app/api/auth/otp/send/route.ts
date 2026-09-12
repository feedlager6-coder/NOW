import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getActiveOtpProvider } from '@/infrastructure/auth/otp-factory';
import { StagingGateService } from '@/domain/auth/staging-gate-service';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(20),
});

export async function POST(request: Request) {
  try {
    const env = getEnv();

    // Enforce Staging Gate if in staging_gate mode
    if (env.AUTH_MODE === 'staging_gate') {
      const cookieStore = cookies();
      const gateToken = cookieStore.get(StagingGateService.COOKIE_NAME)?.value;
      if (!StagingGateService.verifyGateToken(gateToken)) {
        return NextResponse.json(
          {
            success: false,
            error: 'STAGING_GATE_REQUIRED',
            message: 'Доступ к закрытому стенду заблокирован. Требуется ввести инвайт-код доступа стенда.',
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PHONE_FORMAT', message: 'Некорректный номер телефона.' },
        { status: 400 }
      );
    }

    const phone = parsed.data.phone.trim();
    const otpProvider = getActiveOtpProvider();
    const result = await otpProvider.sendOtp(phone);

    if (!result.success) {
      if (result.error === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.json(
          {
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Слишком много запросов кода. Повторите попытку через 10 минут.',
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message:
            result.message ||
            'В режиме закрытого тестирования разрешены только синтетические номера вида +79990000001 ... +79990000099.',
        },
        { status: 400 }
      );
    }

    logger.info('otp_send_success', {
      details: {
        expiresInSeconds: result.expiresInSeconds,
      },
    });

    return NextResponse.json(
      {
        success: true,
        expiresInSeconds: result.expiresInSeconds,
        devHint: env.AUTH_MODE === 'dev_otp' ? 'В режиме разработки используйте фиксированный код: 000000' : undefined,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('otp_send_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
