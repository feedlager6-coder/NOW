import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoStore } from '@/lib/demo-store';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const reportSchema = z.object({
  reporterId: z.string().min(1, 'reporterId is required'),
  targetId: z.string().optional(),
  category: z.enum([
    'commercial_solicitation',
    'harassment',
    'unsafe_behavior',
    'inappropriate_content',
    'no_show',
    'other',
  ]),
  description: z.string().min(1, 'Пожалуйста, укажите причину жалобы').max(500, 'Максимум 500 символов'),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = reportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 422 }
      );
    }

    const report = demoStore.addReport({
      meetupId: params.id,
      reporterId: parsed.data.reporterId,
      targetId: parsed.data.targetId,
      category: parsed.data.category,
      description: parsed.data.description,
    });

    logger.warn('meetup_report_submitted_demo', {
      resourceId: params.id,
      resourceType: 'meetup_report',
      actorId: parsed.data.reporterId,
      details: { category: parsed.data.category, targetId: parsed.data.targetId },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Жалоба принята модерацией NOW. Спасибо за обеспечение безопасности!',
        reportId: report.id,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('report_post_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
