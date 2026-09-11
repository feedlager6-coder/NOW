import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoStore } from '@/lib/demo-store';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const blockSchema = z.object({
  blockerId: z.string().min(1, 'blockerId is required'),
  blockedId: z.string().min(1, 'blockedId is required'),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = blockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 422 }
      );
    }

    if (parsed.data.blockerId === parsed.data.blockedId) {
      return NextResponse.json(
        { success: false, error: 'CANNOT_BLOCK_SELF', message: 'Нельзя заблокировать самого себя' },
        { status: 400 }
      );
    }

    const success = demoStore.addBlock(parsed.data.blockerId, parsed.data.blockedId);

    logger.info('user_blocked_demo', {
      resourceId: params.id,
      resourceType: 'user_block',
      actorId: parsed.data.blockerId,
      details: { blockedId: parsed.data.blockedId },
    });

    return NextResponse.json(
      {
        success,
        message: 'Пользователь заблокирован. Вы больше не увидите активности друг друга.',
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('block_post_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
