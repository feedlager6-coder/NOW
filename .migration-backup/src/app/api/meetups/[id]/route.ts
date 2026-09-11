import { NextResponse } from 'next/server';
import { demoStore } from '@/lib/demo-store';
import { MeetupRepository } from '@/repositories/meetup-repository';
import { getCurrentUserSession } from '@/lib/auth-session';
import { DEMO_USERS, DEMO_ACTIVITY_TYPES, DEMO_PUBLIC_ZONES } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionData = await getCurrentUserSession();
  const meetup = demoStore.getById(params.id);

  if (meetup) {
    const act = DEMO_ACTIVITY_TYPES.find((a) => a.id === meetup.activityTypeId) || {
      title: 'Активность',
      icon: '🔥',
    };
    const zone = DEMO_PUBLIC_ZONES.find((z) => z.id === meetup.zoneId) || {
      name: meetup.zoneId,
    };

    const participants = meetup.participantIds.map((pId) => {
      const u = DEMO_USERS.find((usr) => usr.id === pId);
      const isCheckedIn = meetup.checkedInUserIds.includes(pId);
      return {
        userId: pId,
        displayName: u?.displayName || 'Участник',
        ageBand: u?.ageBand || '18+',
        avatarRef: u?.avatarRef || '/avatars/silhouette-1.svg',
        reliabilityScore: u?.reliabilityScore || 100,
        isCreator: pId === meetup.creatorId,
        isCheckedIn,
      };
    });

    const now = Date.now();
    const startsAtMs = new Date(meetup.startsAt).getTime();
    const startsInMinutes = Math.max(0, Math.round((startsAtMs - now) / 60000));

    const { searchParams } = new URL(request.url);
    const currentUserId = sessionData?.user.id || searchParams.get('userId') || 'demo-user-alex';
    const isJoined = meetup.participantIds.includes(currentUserId) || meetup.creatorId === currentUserId;
    const publicPlaceName = isJoined ? meetup.publicPlaceName : null;

    return NextResponse.json(
      {
        success: true,
        mode: 'DEMO_MODE',
        meetup: {
          id: meetup.id,
          creatorId: meetup.creatorId,
          activityTypeId: meetup.activityTypeId,
          activityTitle: act.title,
          activityIcon: act.icon,
          zoneId: meetup.zoneId,
          zoneName: zone.name,
          publicPlaceName,
          startsAt: new Date(meetup.startsAt).toISOString(),
          startsInMinutes,
          durationMinutes: meetup.durationMinutes,
          capacity: meetup.capacity,
          status: meetup.status,
          safeDescription: meetup.safeDescription,
          participants,
          occupiedSlots: participants.length,
          freeSlots: Math.max(0, meetup.capacity - participants.length),
        },
      },
      { status: 200 }
    );
  }

  // Try PostgreSQL
  try {
    const dbDetails = await MeetupRepository.getMeetupById(params.id, sessionData?.user.id);
    if (!dbDetails) {
      return NextResponse.json(
        { success: false, error: 'MEETUP_NOT_FOUND' },
        { status: 404 }
      );
    }

    const now = Date.now();
    const startsAtMs = new Date(dbDetails.meetup.startsAt).getTime();
    const startsInMinutes = Math.max(0, Math.round((startsAtMs - now) / 60000));

    return NextResponse.json(
      {
        success: true,
        mode: 'LOCAL_TEST_MODE',
        meetup: {
          id: dbDetails.meetup.id,
          creatorId: dbDetails.meetup.creatorId,
          activityTypeId: dbDetails.meetup.activityTypeId,
          activityTitle: dbDetails.meetup.activityTitle,
          activityIcon: dbDetails.meetup.activityIcon,
          zoneId: dbDetails.meetup.zoneId,
          zoneName: dbDetails.meetup.zoneName,
          publicPlaceName: dbDetails.meetup.publicPlaceName,
          startsAt: new Date(dbDetails.meetup.startsAt).toISOString(),
          startsInMinutes,
          durationMinutes: dbDetails.meetup.durationMinutes,
          capacity: dbDetails.meetup.capacity,
          status: dbDetails.meetup.status,
          safeDescription: dbDetails.meetup.safeDescription,
          participants: dbDetails.participants.map((p: any) => ({
            userId: p.userId,
            displayName: p.displayName || 'Участник',
            ageBand: p.showAgeBandAndInterests ? p.ageBand : undefined,
            avatarRef: p.avatarRef || '/avatars/silhouette-1.svg',
            reliabilityScore: p.reliabilityScore || 100,
            isCreator: p.userId === dbDetails.meetup.creatorId,
            isCheckedIn: p.status === 'checked_in',
          })),
          occupiedSlots: dbDetails.participants.length,
          freeSlots: Math.max(0, dbDetails.meetup.capacity - dbDetails.participants.length),
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'MEETUP_NOT_FOUND' },
      { status: 404 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    if (body.status) {
      const res = demoStore.setStatus(params.id, body.status);
      if (res.success) {
        return NextResponse.json({ success: true, meetup: res.meetup });
      }

      // Try database
      try {
        const sessionData = await getCurrentUserSession();
        if (body.status === 'completed' && sessionData) {
          const updated = await MeetupRepository.completeMeetup(params.id, sessionData.user.id);
          return NextResponse.json({ success: true, meetup: updated });
        }
      } catch {
        // continue to error
      }

      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'NO_CHANGES_PROVIDED' }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
