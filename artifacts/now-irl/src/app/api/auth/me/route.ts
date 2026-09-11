import { NextResponse } from 'next/server';
import { getCurrentUserSession } from '@/lib/auth-session';
import { UserRepository } from '@/repositories/user-repository';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionData = await getCurrentUserSession();

    if (!sessionData) {
      return NextResponse.json(
        {
          success: true,
          authenticated: false,
          user: null,
          profile: null,
          interests: [],
          onboardingStatus: {
            hasConfirmedAge: false,
            hasProfile: false,
            hasConsents: false,
            isFullyOnboarded: false,
          },
        },
        { status: 200 }
      );
    }

    const fullProfile = await UserRepository.getUserFullProfile(sessionData.user.id);

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        user: fullProfile?.user || {
          id: sessionData.user.id,
          role: sessionData.user.role,
          status: sessionData.user.status,
          ageConfirmedAt: sessionData.user.ageConfirmedAt,
          createdAt: sessionData.user.createdAt,
        },
        profile: fullProfile?.profile || null,
        interests: fullProfile?.interests || [],
        onboardingStatus: fullProfile?.onboardingStatus || {
          hasConfirmedAge: sessionData.user.ageConfirmedAt !== null,
          hasProfile: false,
          hasConsents: false,
          isFullyOnboarded: false,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('auth_me_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
