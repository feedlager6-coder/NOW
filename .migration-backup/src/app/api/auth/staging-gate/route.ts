import { NextResponse } from 'next/server';
import { z } from 'zod';
import { StagingGateService } from '@/domain/auth/staging-gate-service';
import { getEnv } from '@/lib/env';

import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const gateSchema = z.object({
  accessCode: z.string().min(1, 'Введите код доступа').max(100),
});

/**
 * Derives a neutral ephemeral partition key for best-effort in-memory rate limiting.
 * - Does NOT persist or log raw network headers.
 * - Does NOT treat x-forwarded-for as a trusted identity without proxy trust.
 * - Does NOT perform browser or device IP fingerprinting.
 */
function getEphemeralRateLimitKey(request: Request): string {
  const header = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!header) {
    return 'gate_anon_partition';
  }
  // Short one-way hash partition (non-reversible, ephemeral)
  const hash = crypto.createHash('sha256').update(header).digest('hex').substring(0, 16);
  return `gate_tmp_${hash}`;
}

export async function POST(request: Request) {
  try {
    const env = getEnv();

    if (env.AUTH_MODE !== 'staging_gate') {
      return NextResponse.json(
        {
          success: false,
          error: 'STAGING_GATE_NOT_ACTIVE',
          message: 'Шлюз закрытого тестирования не активен в текущем режиме.',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = gateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', message: 'Некорректный формат кода доступа.' },
        { status: 400 }
      );
    }

    const clientIdentifier = getEphemeralRateLimitKey(request);
    const result = StagingGateService.verifyAccessCode(parsed.data.accessCode, clientIdentifier);

    if (!result.success) {
      const status = result.error === 'RATE_LIMIT_EXCEEDED' ? 429 : 401;
      return NextResponse.json(
        { success: false, error: result.error, message: result.message },
        { status }
      );
    }

    const response = NextResponse.json(
      { success: true, message: result.message },
      { status: 200 }
    );

    response.cookies.set({
      name: StagingGateService.COOKIE_NAME,
      value: result.token!,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: StagingGateService.COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Внутренняя ошибка проверки доступа.' },
      { status: 500 }
    );
  }
}
