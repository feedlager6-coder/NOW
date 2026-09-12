import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoStore } from '@/lib/demo-store';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const safetyEventSchema = z.object({
  reporterId: z.string().min(1, 'reporterId is required'),
  eventType: z.enum(['sos_triggered', 'help_opened', 'emergency_call_initiated', 'safety_guidance_viewed']),
  details: z.record(z.unknown()).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = safetyEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 422 }
      );
    }

    const event = demoStore.addSafetyEvent({
      meetupId: params.id,
      reporterId: parsed.data.reporterId,
      eventType: parsed.data.eventType,
      details: parsed.data.details,
    });

    logger.warn('safety_event_recorded_demo', {
      resourceId: params.id,
      resourceType: 'safety_event',
      actorId: parsed.data.reporterId,
      details: { eventType: parsed.data.eventType },
    });

    return NextResponse.json(
      {
        success: true,
        eventId: event.id,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('safety_event_post_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
