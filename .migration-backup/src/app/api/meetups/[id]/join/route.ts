import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoStore } from '@/lib/demo-store';
import { MeetupRepository } from '@/repositories/meetup-repository';
import { getCurrentUserSession } from '@/lib/auth-session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const joinSchema = z.object({
  userId: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionData = await getCurrentUserSession();
    const body = await request.json().catch(() => ({}));
    const parsed = joinSchema.safeParse(body);

    const targetUserId = sessionData ? sessionData.user.id : parsed.data?.userId;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Требуется указать пользователя или авторизоваться.' },
        { status: 401 }
      );
    }

    // Check onboarding if authenticated
    if (sessionData) {
      if (!sessionData.user.ageConfirmedAt) {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN_ONBOARDING_REQUIRED',
            message: 'Необходимо подтвердить возраст 18+ для участия во встречах.',
          },
          { status: 403 }
        );
      }
      if (!sessionData.profile?.displayName) {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN_ONBOARDING_REQUIRED',
            message: 'Необходимо заполнить имя в профиле.',
          },
          { status: 403 }
        );
      }
    }

    // Try demoStore first
    const demoMeetup = demoStore.getById(params.id);
    if (demoMeetup) {
      const res = demoStore.join(params.id, targetUserId);

      if (!res.success) {
        if (res.error === 'CAPACITY_REACHED') {
          return NextResponse.json(
            { success: false, error: 'CAPACITY_REACHED', message: 'Все места в этом Огоньке уже заняты' },
            { status: 409 }
          );
        }
        if (res.error === 'ALREADY_JOINED') {
          return NextResponse.json(
            { success: false, error: 'ALREADY_JOINED', message: 'Вы уже являетесь участником' },
            { status: 409 }
          );
        }
        if (res.error === 'SAFETY_RESTRICTION') {
          return NextResponse.json(
            { success: false, error: 'SAFETY_RESTRICTION', message: 'Действие недоступно по соображениям безопасности' },
            { status: 403 }
          );
        }
        if (res.error === 'MEETUP_INACTIVE') {
          return NextResponse.json(
            { success: false, error: 'MEETUP_INACTIVE', message: 'Активность уже завершена или отменена' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { success: false, error: res.error || 'JOIN_FAILED' },
          { status: 400 }
        );
      }

      logger.info('meetup_joined_demo', {
        resourceId: params.id,
        resourceType: 'meetup',
        actorId: targetUserId,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Вы успешно присоединились к Огоньку!',
          meetup: res.meetup ? demoStore.serializeMeetup(res.meetup) : undefined,
        },
        { status: 200 }
      );
    }

    // Try PostgreSQL
    try {
      const joinRes = await MeetupRepository.joinMeetup(params.id, targetUserId);
      if (joinRes.alreadyJoined) {
        return NextResponse.json(
          { success: false, error: 'ALREADY_JOINED', message: 'Вы уже являетесь участником' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Вы успешно присоединились к Огоньку!',
        },
        { status: 200 }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'JOIN_FAILED';
      if (msg === 'CAPACITY_FULL') {
        return NextResponse.json(
          { success: false, error: 'CAPACITY_REACHED', message: 'Все места уже заняты' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: msg },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('meetup_join_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
