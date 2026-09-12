import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoStore } from '@/lib/demo-store';
import { MeetupRepository } from '@/repositories/meetup-repository';
import { getCurrentUserSession } from '@/lib/auth-session';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  category: z.string().optional(),
  zoneId: z.string().optional(),
  userId: z.string().optional(),
  mode: z.enum(['demo', 'local', 'auto']).optional(),
});

const createMeetupSchema = z.object({
  creatorId: z.string().optional(),
  activityTypeId: z.enum([
    'walking',
    'walk',
    'coffee',
    'football',
    'sports_viewing',
    'board_games',
    'study',
    'workout',
  ]),
  zoneId: z.enum([
    'DEMO_ZONE_NORTH',
    'DEMO_ZONE_CENTER',
    'DEMO_ZONE_PARK',
    'DEMO_ZONE_RIVER',
    'DEMO_ZONE_SPORT',
  ]),
  publicPlaceName: z.string().min(2).max(100),
  startsInMinutes: z.coerce.number().min(0).max(180).default(15),
  capacity: z.coerce.number().min(2).max(10).default(4),
  safeDescription: z.string().max(200).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = {
      category: searchParams.get('category') || undefined,
      zoneId: searchParams.get('zoneId') || undefined,
      userId: searchParams.get('userId') || undefined,
      mode: searchParams.get('mode') || undefined,
    };

    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_QUERY_PARAMS', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const sessionData = await getCurrentUserSession();
    const env = getEnv();

    // If explicit demo mode or no session and demo mode is enabled -> use demoStore
    const isExplicitDemo = parsed.data.mode === 'demo';
    const isExplicitLocal = parsed.data.mode === 'local';

    if (isExplicitDemo || (!sessionData && !isExplicitLocal && env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true')) {
      const cards = demoStore.getAll({
        category: parsed.data.category,
        zoneId: parsed.data.zoneId,
        currentUserId: parsed.data.userId || sessionData?.user.id,
      });

      return NextResponse.json(
        {
          success: true,
          mode: 'DEMO_MODE',
          count: cards.length,
          meetups: cards,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Try PostgreSQL repository if user is authenticated or in local mode
    try {
      const currentUserId = sessionData?.user.id || parsed.data.userId;
      const dbCards = await MeetupRepository.getAllMeetups({
        category: parsed.data.category,
        zoneId: parsed.data.zoneId,
        currentUserId,
      });

      return NextResponse.json(
        {
          success: true,
          mode: 'LOCAL_TEST_MODE',
          count: dbCards.length,
          meetups: dbCards,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    } catch {
      // Fallback to demo store if DB not ready
      const cards = demoStore.getAll({
        category: parsed.data.category,
        zoneId: parsed.data.zoneId,
        currentUserId: parsed.data.userId,
      });
      return NextResponse.json(
        {
          success: true,
          mode: 'DEMO_MODE_FALLBACK',
          count: cards.length,
          meetups: cards,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('meetups_get_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionData = await getCurrentUserSession();
    const env = getEnv();

    const body = await request.json();
    const parsed = createMeetupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 422 }
      );
    }

    // Authenticated PostgreSQL mode
    if (sessionData) {
      // Enforce 18+ gate and profile onboarding
      if (!sessionData.user.ageConfirmedAt) {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN_ONBOARDING_REQUIRED',
            message: 'Для создания активности необходимо подтвердить возраст 18+.',
          },
          { status: 403 }
        );
      }

      if (!sessionData.profile?.displayName) {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN_ONBOARDING_REQUIRED',
            message: 'Для создания активности необходимо заполнить имя в профиле.',
          },
          { status: 403 }
        );
      }

      try {
        const createdDb = await MeetupRepository.createMeetup({
          creatorId: sessionData.user.id,
          activityTypeId: parsed.data.activityTypeId === 'walking' ? 'walk' : parsed.data.activityTypeId,
          zoneId: parsed.data.zoneId,
          publicPlaceName: parsed.data.publicPlaceName,
          startsInMinutes: parsed.data.startsInMinutes,
          capacity: parsed.data.capacity,
          safeDescription: parsed.data.safeDescription,
          isDemo: false,
        });

        logger.info('meetup_created_db', {
          resourceId: createdDb.id,
          resourceType: 'meetup',
          actorId: sessionData.user.id,
        });

        return NextResponse.json(
          {
            success: true,
            mode: 'LOCAL_TEST_MODE',
            rawId: createdDb.id,
            meetup: {
              id: createdDb.id,
              status: createdDb.status,
              startsAt: createdDb.startsAt.toISOString(),
            },
          },
          { status: 201 }
        );
      } catch (dbErr: unknown) {
        // If DB table not ready, allow fallback in dev/demo
        logger.warn('db_meetup_creation_fallback', {
          details: { error: dbErr instanceof Error ? dbErr.message : 'Unknown' },
        });
      }
    }

    // Unauthenticated or DEMO MODE
    if (env.NEXT_PUBLIC_ENABLE_DEMO_MODE !== 'true' && !sessionData) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Требуется авторизация.' },
        { status: 401 }
      );
    }

    const creatorId = parsed.data.creatorId || sessionData?.user.id || 'demo-user-alex';
    const created = demoStore.create({
      creatorId,
      activityTypeId: parsed.data.activityTypeId,
      zoneId: parsed.data.zoneId,
      publicPlaceName: parsed.data.publicPlaceName,
      startsInMinutes: parsed.data.startsInMinutes,
      capacity: parsed.data.capacity,
      safeDescription: parsed.data.safeDescription,
    });

    const serialized = demoStore.serializeMeetup(created);

    logger.info('meetup_created_demo', {
      resourceId: created.id,
      resourceType: 'meetup',
      actorId: created.creatorId,
    });

    return NextResponse.json(
      {
        success: true,
        mode: 'DEMO_MODE',
        meetup: serialized,
        rawId: created.id,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('meetup_create_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
