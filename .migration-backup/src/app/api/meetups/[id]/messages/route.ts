import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoStore } from '@/lib/demo-store';
import { MeetupRepository } from '@/repositories/meetup-repository';
import { getCurrentUserSession } from '@/lib/auth-session';
import { SafetyGuard } from '@/domain/safety-guard';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const messageSchema = z.object({
  userId: z.string().optional(),
  text: z.string().min(1, 'Сообщение не может быть пустым').max(200, 'Максимум 200 символов'),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionData = await getCurrentUserSession();
    const { searchParams } = new URL(request.url);
    const userId = sessionData ? sessionData.user.id : searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'USER_ID_REQUIRED', message: 'Не указан userId' },
        { status: 400 }
      );
    }

    const demoMeetup = demoStore.getById(params.id);
    if (demoMeetup) {
      const res = demoStore.getMessages(params.id, userId);

      if (!res.success) {
        if (res.error === 'FORBIDDEN_NOT_PARTICIPANT') {
          return NextResponse.json(
            { success: false, error: 'FORBIDDEN_NOT_PARTICIPANT', message: 'Чат доступен только участникам Огонька' },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { success: false, error: res.error || 'MESSAGES_FETCH_FAILED' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          messages: res.messages || [],
        },
        { status: 200 }
      );
    }

    // Try PostgreSQL
    try {
      const dbMeetup = await MeetupRepository.getMeetupById(params.id, userId);
      if (!dbMeetup) {
        return NextResponse.json(
          { success: false, error: 'MEETUP_NOT_FOUND' },
          { status: 404 }
        );
      }
      if (!dbMeetup.isUserParticipant) {
        return NextResponse.json(
          { success: false, error: 'FORBIDDEN_NOT_PARTICIPANT', message: 'Чат доступен только участникам Огонька' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          messages: dbMeetup.messages.map((m) => ({
            id: m.id,
            userId: m.senderId,
            senderName: m.senderName || 'Участник',
            avatarRef: m.senderAvatar || '👤',
            text: m.body,
            createdAt: m.createdAt.toISOString(),
          })),
        },
        { status: 200 }
      );
    } catch {
      return NextResponse.json(
        { success: false, error: 'MESSAGES_FETCH_FAILED' },
        { status: 404 }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('messages_get_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionData = await getCurrentUserSession();
    const body = await request.json();
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 422 }
      );
    }

    const senderId = sessionData ? sessionData.user.id : parsed.data.userId;
    if (!senderId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Требуется авторизация.' },
        { status: 401 }
      );
    }

    // Check content safety
    const safetyCheck = SafetyGuard.validateMessageContent(parsed.data.text);
    if (!safetyCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN_CONTENT',
          message: safetyCheck.reason || 'Сообщение отклонено по соображениям безопасности.',
        },
        { status: 422 }
      );
    }

    const demoMeetup = demoStore.getById(params.id);
    if (demoMeetup) {
      const res = demoStore.addMessage(params.id, senderId, parsed.data.text);

      if (!res.success) {
        if (res.error === 'FORBIDDEN_NOT_PARTICIPANT') {
          return NextResponse.json(
            { success: false, error: 'FORBIDDEN_NOT_PARTICIPANT', message: 'Чат доступен только участникам Огонька' },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { success: false, error: res.error || 'MESSAGE_SEND_FAILED' },
          { status: 400 }
        );
      }

      logger.info('chat_message_sent_demo', {
        resourceId: params.id,
        resourceType: 'meetup_chat',
        actorId: senderId,
      });

      return NextResponse.json(
        {
          success: true,
          message: res.message,
        },
        { status: 201 }
      );
    }

    // Try PostgreSQL
    try {
      const dbMeetup = await MeetupRepository.getMeetupById(params.id, senderId);
      if (!dbMeetup || !dbMeetup.isUserParticipant) {
        return NextResponse.json(
          { success: false, error: 'FORBIDDEN_NOT_PARTICIPANT', message: 'Чат доступен только участникам Огонька' },
          { status: 403 }
        );
      }

      const msg = await MeetupRepository.addMessage(params.id, senderId, parsed.data.text, 12);

      return NextResponse.json(
        {
          success: true,
          message: {
            id: msg.id,
            userId: msg.senderId,
            senderName: sessionData?.profile?.displayName || 'Участник',
            avatarRef: sessionData?.profile?.avatarRef || '👤',
            text: msg.body,
            createdAt: msg.createdAt.toISOString(),
          },
        },
        { status: 201 }
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'MESSAGE_SEND_FAILED';
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('messages_post_failure', { details: { error: errorMsg } });
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
