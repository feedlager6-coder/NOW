import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getActiveOtpProvider } from '@/infrastructure/auth/otp-factory';
import { StagingGateService } from '@/domain/auth/staging-gate-service';
import { SessionService } from '@/domain/auth/session-service';
import { UserRepository } from '@/repositories/user-repository';
import { setSessionCookie } from '@/lib/auth-session';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().length(6),
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
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Некорректный номер или код.' },
        { status: 400 }
      );
    }

    const phone = parsed.data.phone.trim();
    const code = parsed.data.code.trim();

    const otpProvider = getActiveOtpProvider();
    const otpVerification = await otpProvider.verifyOtp(phone, code);
    if (!otpVerification.success) {
      return NextResponse.json(
        {
          success: false,
          error: otpVerification.error,
          message:
            otpVerification.message || 'Неверный проверочный код.',
        },
        { status: 400 }
      );
    }

    const phoneLookupHash = SessionService.computePhoneLookupHash(phone, env.OTP_HMAC_SECRET);

    // Find or create user in database
    let user = await UserRepository.findByPhoneLookupHash(phoneLookupHash);
    let isNewUser = false;
    if (!user) {
      user = await UserRepository.createUser({ phoneLookupHash });
      isNewUser = true;
    }

    // Check if user is banned
    if (user.status === 'banned') {
      return NextResponse.json(
        { success: false, error: 'USER_BANNED', message: 'Доступ ограничен.' },
        { status: 403 }
      );
    }

    // Generate 32-byte session token
    const { rawToken, tokenHash } = SessionService.generateSessionToken();
    const expiresAt = SessionService.calculateExpirationDate();

    // Persist session to database
    await UserRepository.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Check full profile and onboarding status
    const fullProfile = await UserRepository.getUserFullProfile(user.id);
    const hasConfirmedAge = user.ageConfirmedAt !== null;
    const hasProfile = !!fullProfile?.profile?.displayName;
    const isFullyOnboarded = hasConfirmedAge && hasProfile;

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          role: user.role,
        },
        isNewUser,
        onboarding: {
          needsAgeGate: !hasConfirmedAge,
          needsProfile: !hasProfile,
          isFullyOnboarded,
        },
      },
      { status: 200 }
    );

    // Set HTTP-Only session cookie
    setSessionCookie(response, rawToken, expiresAt);

    logger.info('user_authenticated', {
      actorId: user.id,
      resourceType: 'session',
      details: { isNewUser, isFullyOnboarded },
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('otp_verify_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
