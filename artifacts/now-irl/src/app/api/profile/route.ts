import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserSession } from '@/lib/auth-session';
import { UserRepository } from '@/repositories/user-repository';
import { ProfileValidator, WHITELIST_INTERESTS } from '@/domain/profile/interest-catalog';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(30),
  bio: z.string().max(150).optional(),
  interestIds: z.array(z.string()).max(5).optional(),
  showAgeBandAndInterests: z.boolean().optional(),
  avatarRef: z.string().optional(),
});

export async function GET() {
  try {
    const sessionData = await getCurrentUserSession();
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Требуется авторизация.' },
        { status: 401 }
      );
    }

    const full = await UserRepository.getUserFullProfile(sessionData.user.id);

    return NextResponse.json(
      {
        success: true,
        user: full?.user,
        profile: full?.profile,
        interests: full?.interests || [],
        whitelistInterests: WHITELIST_INTERESTS,
        onboardingStatus: full?.onboardingStatus,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('profile_get_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionData = await getCurrentUserSession();
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Требуется авторизация.' },
        { status: 401 }
      );
    }

    // Require age gate to be completed
    if (!sessionData.user.ageConfirmedAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'AGE_GATE_REQUIRED',
          message: 'Сначала необходимо пройти подтверждение возраста 18+.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message || 'Некорректные данные профиля.',
        },
        { status: 400 }
      );
    }

    // Domain validation (HTML sanitization, max 5 whitelist interests)
    const validation = ProfileValidator.validateProfile({
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      interestIds: parsed.data.interestIds,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'PROFILE_VALIDATION_ERROR',
          message: validation.error,
        },
        { status: 422 }
      );
    }

    // 1. Save profile
    const updatedProfile = await UserRepository.saveProfile({
      userId: sessionData.user.id,
      displayName: validation.sanitizedName!,
      bio: validation.sanitizedBio,
      showAgeBandAndInterests: parsed.data.showAgeBandAndInterests ?? true,
      avatarRef: parsed.data.avatarRef || sessionData.profile?.avatarRef || '👤',
    });

    // 2. Save user interests
    if (parsed.data.interestIds) {
      await UserRepository.setUserInterests(sessionData.user.id, parsed.data.interestIds);
    }

    const full = await UserRepository.getUserFullProfile(sessionData.user.id);

    logger.info('profile_updated', {
      actorId: sessionData.user.id,
      details: {
        interestCount: parsed.data.interestIds?.length || 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        profile: updatedProfile,
        interests: full?.interests || [],
        onboardingStatus: full?.onboardingStatus,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('profile_patch_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
