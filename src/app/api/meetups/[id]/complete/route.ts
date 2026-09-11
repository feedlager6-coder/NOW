import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoStore } from '@/lib/demo-store';
import { MeetupRepository } from '@/repositories/meetup-repository';
import { getCurrentUserSession } from '@/lib/auth-session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const completeSchema = z.object({
  userId: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionData = await getCurrentUserSession();
    const body = await request.json().catch(() => ({}));
    const parsed = completeSchema.safeParse(body);

    const targetUserId = sessionData ? sessionData.user.id : parsed.data?.userId;

    const demoMeetup = demoStore.getById(params.id);
    if (demoMeetup) {
      const res = demoStore.complete(params.id, targetUserId);
      if (!res.success) {
        return NextResponse.json(
          { success: false, error: res.error || 'COMPLETE_FAILED' },
          { status: 400 }
        );
      }

      logger.info('meetup_completed_demo', {
        resourceId: params.id,
        resourceType: 'meetup',
        actorId: targetUserId,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Активность успешно завершена!',
          status: 'completed',
        },
        { status: 200 }
      );
    }

    // Try PostgreSQL
    try {
      await MeetupRepository.completeMeetup(params.id, targetUserId || '');
      return NextResponse.json(
        {
          success: true,
          message: 'Активность успешно завершена!',
          status: 'completed',
        },
        { status: 200 }
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'COMPLETE_FAILED';
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('meetup_complete_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
