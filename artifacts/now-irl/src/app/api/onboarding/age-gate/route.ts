import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserSession } from '@/lib/auth-session';
import { AgeService } from '@/domain/auth/age-service';
import { UserRepository } from '@/repositories/user-repository';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ageGateSchema = z.object({
  birthYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
  birthMonth: z.coerce.number().min(1).max(12),
  consentAccepted: z.boolean().refine((val) => val === true, {
    message: 'Необходимо подтвердить правила сервиса и возраст 18+',
  }),
});

export async function POST(request: Request) {
  try {
    const sessionData = await getCurrentUserSession();
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Требуется авторизация.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = ageGateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message || 'Некорректные данные возраста.',
        },
        { status: 400 }
      );
    }

    const { birthYear, birthMonth } = parsed.data;
    const ageResult = AgeService.calculateAgeBand(birthYear, birthMonth);

    if (!ageResult.isAdult || !ageResult.ageBand) {
      logger.warn('age_gate_rejected', {
        actorId: sessionData.user.id,
        details: { reason: ageResult.error },
      });
      return NextResponse.json(
        {
          success: false,
          error: ageResult.error || 'AGE_BELOW_18',
          message:
            ageResult.message ||
            'Сервис спонтанных встреч NOW строго 18+. Регистрация несовершеннолетних запрещена.',
        },
        { status: 403 }
      );
    }

    const now = new Date();

    // 1. Record consent with canonical hash
    const canonicalConsentText = `NOW_CONSENT_18_PLUS_TERMS_V1_${now.toISOString().slice(0, 10)}`;
    const textHash = AgeService.computeConsentHash(canonicalConsentText);

    await UserRepository.recordConsent({
      userId: sessionData.user.id,
      consentType: 'TERMS_AND_18_PLUS',
      documentVersion: '2026-v1',
      textHash,
    });

    // 2. Confirm age in user record
    await UserRepository.updateUserAgeConfirmed(sessionData.user.id, now);

    // 3. Save profile with ageBand
    await UserRepository.saveProfile({
      userId: sessionData.user.id,
      displayName: sessionData.profile?.displayName || 'Новый участник',
      ageBand: ageResult.ageBand,
      city: sessionData.profile?.city || 'DEMO CITY',
      showAgeBandAndInterests: true,
    });

    logger.info('age_gate_passed', {
      actorId: sessionData.user.id,
      details: { ageBand: ageResult.ageBand },
    });

    return NextResponse.json(
      {
        success: true,
        ageBand: ageResult.ageBand,
        onboarding: {
          needsAgeGate: false,
          needsProfile: !sessionData.profile?.displayName || sessionData.profile.displayName === 'Новый участник',
          isFullyOnboarded: !!sessionData.profile?.displayName && sessionData.profile.displayName !== 'Новый участник',
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('age_gate_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
