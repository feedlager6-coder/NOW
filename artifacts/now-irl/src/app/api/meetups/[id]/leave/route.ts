import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoStore } from '@/lib/demo-store';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const leaveSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = leaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 422 }
      );
    }

    const res = demoStore.leave(params.id, parsed.data.userId);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || 'LEAVE_FAILED' },
        { status: 400 }
      );
    }

    logger.info('meetup_left_demo', {
      resourceId: params.id,
      resourceType: 'meetup',
      actorId: parsed.data.userId,
    });

    return NextResponse.json(
      { success: true, message: 'Вы покинули активность' },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('meetup_leave_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
