import { NextResponse } from 'next/server';
import { z } from 'zod';
import { devOtpProvider } from '@/infrastructure/auth/dev-otp-provider';
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

    const otpVerification = await devOtpProvider.verifyOtp(phone, code);
    if (!otpVerification.success) {
      return NextResponse.json(
        {
          success: false,
          error: otpVerification.error,
          message:
            otpVerification.error === 'INVALID_CODE'
              ? 'Неверный проверочный код. Для dev-номеров используйте 000000.'
              : 'Ошибка проверки кода.',
        },
        { status: 400 }
      );
    }

    const env = getEnv();
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
