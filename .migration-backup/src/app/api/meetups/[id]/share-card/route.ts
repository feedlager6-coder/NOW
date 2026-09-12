import { NextResponse } from 'next/server';
import { demoStore } from '@/lib/demo-store';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = demoStore.getShareCardData(params.id);

    if (!res.success || !res.card) {
      return NextResponse.json(
        { success: false, error: res.error || 'SHARE_CARD_NOT_FOUND', message: 'Огонёк не найден' },
        { status: 404 }
      );
    }

    logger.info('share_card_generated_demo', {
      resourceId: params.id,
      resourceType: 'share_card',
    });

    return NextResponse.json(
      {
        success: true,
        card: res.card,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('share_card_get_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
