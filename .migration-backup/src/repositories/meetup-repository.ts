import { db as defaultDb } from '@/db';
import {
  meetups,
  meetupParticipants,
  meetupMessages,
  blocks,
  reports,
  safetyEvents,
  profiles,
} from '@/db/schema';
import { eq, and, or, inArray, isNull, gt, sql } from 'drizzle-orm';
import { DEMO_ACTIVITY_TYPES, DEMO_PUBLIC_ZONES } from '@/lib/demo-data';

export interface MeetupCardView {
  id: string;
  activityTypeId: string;
  activityTitle: string;
  activityIcon: string;
  zoneId: string;
  zoneName: string;
  publicPlaceName: string | null;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  occupiedSlots: number;
  distanceBand: string;
  participantSilhouettes: string[];
  isUserJoined: boolean;
  isUserCreator: boolean;
  status: string;
  safeDescription?: string | null;
  isDemo: boolean;
}

// In-Memory fallback store for Local Test Meetups when PostgreSQL is unmigrated or offline
class InMemoryMeetupStore {
  private meetups = new Map<string, any>();
  private participants = new Map<string, any[]>();
  private messages = new Map<string, any[]>();
  private blocks = new Set<string>();
  private reports: any[] = [];
  private safetyEvents: any[] = [];

  public getAllMeetups(filters?: { category?: string; zoneId?: string; currentUserId?: string }): MeetupCardView[] {
    const result: MeetupCardView[] = [];

    for (const m of this.meetups.values()) {
      if (m.status === 'completed' || m.status === 'cancelled') continue;
      if (filters?.category && filters.category !== 'all' && m.activityTypeId !== filters.category) continue;
      if (filters?.zoneId && m.zoneId !== filters.zoneId) continue;

      const pList = this.participants.get(m.id) || [];

      if (filters?.currentUserId) {
        const uid = filters.currentUserId;
        const isBlockedWithCreator =
          this.blocks.has(`${uid}:${m.creatorId}`) || this.blocks.has(`${m.creatorId}:${uid}`);
        if (isBlockedWithCreator) continue;

        const hasBlockedParticipant = pList.some(
          (p) =>
            (p.status === 'joined' || p.status === 'checked_in') &&
            (this.blocks.has(`${uid}:${p.userId}`) || this.blocks.has(`${p.userId}:${uid}`))
        );
        if (hasBlockedParticipant) continue;
      }

      const isUserJoined = filters?.currentUserId
        ? pList.some((p) => p.userId === filters.currentUserId && (p.status === 'joined' || p.status === 'checked_in'))
        : false;
      const isUserCreator = filters?.currentUserId ? m.creatorId === filters.currentUserId : false;

      const act = DEMO_ACTIVITY_TYPES.find((a) => a.id === m.activityTypeId);
      const zone = DEMO_PUBLIC_ZONES.find((z) => z.id === m.zoneId);

      // Mask public place name before joining
      const publicPlaceName = isUserJoined || isUserCreator ? m.publicPlaceName : null;

      result.push({
        id: m.id,
        activityTypeId: m.activityTypeId,
        activityTitle: act?.title || m.activityTypeId,
        activityIcon: act?.icon || '🔥',
        zoneId: m.zoneId,
        zoneName: zone?.name || m.zoneId,
        publicPlaceName,
        startsAt: m.startsAt.toISOString(),
        durationMinutes: m.durationMinutes,
        capacity: m.capacity,
        occupiedSlots: pList.filter((p) => p.status === 'joined' || p.status === 'checked_in').length,
        distanceBand: '~300m - 600m',
        participantSilhouettes: pList.map((p) => p.avatarRef || '/avatars/silhouette-1.svg'),
        isUserJoined,
        isUserCreator,
        status: m.status,
        safeDescription: m.safeDescription,
        isDemo: m.isDemo,
      });
    }

    return result;
  }

  public getMeetupById(meetupId: string, currentUserId?: string) {
    const m = this.meetups.get(meetupId);
    if (!m) return null;

    const pList = this.participants.get(meetupId) || [];
    const activeParticipants = pList.filter((p) => p.status === 'joined' || p.status === 'checked_in');

    const isUserParticipant = currentUserId
      ? activeParticipants.some((p) => p.userId === currentUserId)
      : false;
    const isUserCreator = currentUserId ? m.creatorId === currentUserId : false;

    const act = DEMO_ACTIVITY_TYPES.find((a) => a.id === m.activityTypeId);
    const zone = DEMO_PUBLIC_ZONES.find((z) => z.id === m.zoneId);

    // Mask publicPlaceName for non-participants
    const publicPlaceName = isUserParticipant || isUserCreator ? m.publicPlaceName : null;

    // Messages only for participants
    const msgs = isUserParticipant ? this.messages.get(meetupId) || [] : [];

    return {
      meetup: {
        ...m,
        publicPlaceName,
        activityTitle: act?.title || m.activityTypeId,
        activityIcon: act?.icon || '🔥',
        zoneName: zone?.name || m.zoneId,
      },
      participants: activeParticipants,
      messages: msgs,
      isUserParticipant,
      isUserCreator,
    };
  }

  public createMeetup(data: {
    creatorId: string;
    activityTypeId: string;
    zoneId: string;
    publicPlaceName: string;
    startsInMinutes?: number;
    durationMinutes?: number;
    capacity?: number;
    safeDescription?: string;
    isDemo?: boolean;
  }) {
    const id = `meetup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startsAt = new Date(Date.now() + (data.startsInMinutes || 30) * 60 * 1000);
    const newMeetup = {
      id,
      creatorId: data.creatorId,
      activityTypeId: data.activityTypeId,
      zoneId: data.zoneId,
      publicPlaceName: data.publicPlaceName,
      startsAt,
      durationMinutes: data.durationMinutes || 60,
      capacity: data.capacity || 4,
      status: 'gathering',
      safeDescription: data.safeDescription || null,
      isDemo: data.isDemo ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.meetups.set(id, newMeetup);

    // Add creator as participant
    const p = {
      id: `p-${Date.now()}`,
      meetupId: id,
      userId: data.creatorId,
      role: 'creator',
      status: 'joined',
      joinedAt: new Date(),
      checkedInAt: null,
      displayName: 'Создатель',
      avatarRef: '/avatars/silhouette-1.svg',
      ageBand: '18+',
      reliabilityScore: 100,
    };
    this.participants.set(id, [p]);

    return { ...newMeetup };
  }

  public joinMeetup(meetupId: string, userId: string) {
    const m = this.meetups.get(meetupId);
    if (!m) throw new Error('MEETUP_NOT_FOUND');
    if (m.status !== 'gathering') throw new Error('MEETUP_NOT_GATHERING');

    const pList = this.participants.get(meetupId) || [];
    const active = pList.filter((p) => p.status === 'joined' || p.status === 'checked_in');

    const already = active.some((p) => p.userId === userId);
    if (already) {
      return { success: true, alreadyJoined: true };
    }

    if (active.length >= m.capacity) {
      throw new Error('CAPACITY_FULL');
    }

    const newP = {
      id: `p-${Date.now()}`,
      meetupId,
      userId,
      role: 'participant',
      status: 'joined',
      joinedAt: new Date(),
      checkedInAt: null,
      displayName: 'Участник',
      avatarRef: '/avatars/silhouette-2.svg',
      ageBand: '18+',
      reliabilityScore: 100,
    };

    pList.push(newP);
    this.participants.set(meetupId, pList);

    return { success: true, alreadyJoined: false };
  }

  public leaveMeetup(meetupId: string, userId: string) {
    const pList = this.participants.get(meetupId) || [];
    for (const p of pList) {
      if (p.userId === userId) {
        p.status = 'left';
        p.leftAt = new Date();
      }
    }
  }

  public checkInParticipant(meetupId: string, userId: string) {
    const pList = this.participants.get(meetupId) || [];
    for (const p of pList) {
      if (p.userId === userId) {
        p.status = 'checked_in';
        p.checkedInAt = new Date();
      }
    }

    const checkedInCount = pList.filter((p) => p.status === 'checked_in').length;
    if (checkedInCount >= 2) {
      const m = this.meetups.get(meetupId);
      if (m && m.status === 'gathering') {
        m.status = 'active';
        m.updatedAt = new Date();
      }
    }
  }

  public completeMeetup(meetupId: string, userId: string) {
    const m = this.meetups.get(meetupId);
    if (!m) throw new Error('MEETUP_NOT_FOUND');
    if (m.creatorId !== userId) throw new Error('FORBIDDEN_NOT_CREATOR');

    m.status = 'completed';
    m.updatedAt = new Date();
    return { ...m };
  }

  public addMessage(meetupId: string, senderId: string, body: string, retentionHours = 12) {
    const pList = this.participants.get(meetupId) || [];
    const isParticipant = pList.some(
      (p) => p.userId === senderId && (p.status === 'joined' || p.status === 'checked_in')
    );
    if (!isParticipant) throw new Error('FORBIDDEN_NOT_PARTICIPANT');

    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      meetupId,
      senderId,
      body,
      createdAt: new Date().toISOString(),
      senderName: 'Участник',
      senderAvatar: '/avatars/silhouette-1.svg',
      retentionExpiresAt: new Date(Date.now() + retentionHours * 3600 * 1000),
    };

    const msgs = this.messages.get(meetupId) || [];
    msgs.push(msg);
    this.messages.set(meetupId, msgs);
    return msg;
  }

  public addBlock(blockerId: string, blockedId: string, reason?: string) {
    this.blocks.add(`${blockerId}:${blockedId}`);
    return { blockerId, blockedId, reason };
  }

  public addReport(data: any) {
    const rep = { ...data, id: `rep-${Date.now()}`, createdAt: new Date() };
    this.reports.push(rep);
    return rep;
  }

  public addSafetyEvent(data: any) {
    const ev = { ...data, id: `safe-${Date.now()}`, createdAt: new Date() };
    this.safetyEvents.push(ev);
    return ev;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __memoryMeetupStore: InMemoryMeetupStore | undefined;
}
export const memoryMeetupStore = global.__memoryMeetupStore || new InMemoryMeetupStore();
if (process.env.NODE_ENV !== 'production') {
  global.__memoryMeetupStore = memoryMeetupStore;
}

let dbOffline = false;
let lastDbCheck = 0;

async function executeWithDb<T>(
  tx: any,
  dbOp: () => Promise<T>,
  memoryOp: () => Promise<T>
): Promise<T> {
  if (tx !== defaultDb) {
    return await dbOp();
  }

  const now = Date.now();
  if (dbOffline && now - lastDbCheck < 10000) {
    return await memoryOp();
  }

  try {
    const result = await dbOp();
    dbOffline = false;
    return result;
  } catch {
    dbOffline = true;
    lastDbCheck = Date.now();
    return await memoryOp();
  }
}

export class MeetupRepository {
  public static async getAllMeetups(
    filters?: { category?: string; zoneId?: string; currentUserId?: string },
    tx: any = defaultDb
  ): Promise<MeetupCardView[]> {
    return executeWithDb(
      tx,
      async () => {
        const blockedUserIds = new Set<string>();
        if (filters?.currentUserId) {
          const userBlocks = await tx
            .select()
            .from(blocks)
            .where(
              or(
                eq(blocks.blockerId, filters.currentUserId),
                eq(blocks.blockedId, filters.currentUserId)
              )
            );

          for (const b of userBlocks) {
            if (b.blockerId === filters.currentUserId) {
              blockedUserIds.add(b.blockedId);
            } else {
              blockedUserIds.add(b.blockerId);
            }
          }
        }

        const conditions = [
          inArray(meetups.status, ['gathering', 'active']),
        ];

        if (filters?.category && filters.category !== 'all') {
          conditions.push(eq(meetups.activityTypeId, filters.category));
        }

        if (filters?.zoneId) {
          conditions.push(eq(meetups.zoneId, filters.zoneId));
        }

        const foundMeetups = await tx
          .select()
          .from(meetups)
          .where(and(...conditions))
          .orderBy(meetups.startsAt);

        const result: MeetupCardView[] = [];

        for (const m of foundMeetups) {
          if (blockedUserIds.has(m.creatorId)) {
            continue;
          }

          const participants = await tx
            .select({
              userId: meetupParticipants.userId,
              avatarRef: profiles.avatarRef,
            })
            .from(meetupParticipants)
            .leftJoin(profiles, eq(meetupParticipants.userId, profiles.userId))
            .where(
              and(
                eq(meetupParticipants.meetupId, m.id),
                inArray(meetupParticipants.status, ['joined', 'checked_in'])
              )
            );

          const hasBlockedParticipant = participants.some((p: any) => blockedUserIds.has(p.userId));
          if (hasBlockedParticipant) {
            continue;
          }

          const act = DEMO_ACTIVITY_TYPES.find((a) => a.id === m.activityTypeId);
          const zone = DEMO_PUBLIC_ZONES.find((z) => z.id === m.zoneId);

          const isUserJoined = filters?.currentUserId
            ? participants.some((p: any) => p.userId === filters.currentUserId)
            : false;
          const isUserCreator = filters?.currentUserId
            ? m.creatorId === filters.currentUserId
            : false;

          // Mask publicPlaceName for unjoined users
          const publicPlaceName = isUserJoined || isUserCreator ? m.publicPlaceName : null;

          result.push({
            id: m.id,
            activityTypeId: m.activityTypeId,
            activityTitle: act?.title || m.activityTypeId,
            activityIcon: act?.icon || '🔥',
            zoneId: m.zoneId,
            zoneName: zone?.name || m.zoneId,
            publicPlaceName,
            startsAt: m.startsAt.toISOString(),
            durationMinutes: m.durationMinutes,
            capacity: m.capacity,
            occupiedSlots: participants.length,
            distanceBand: '~400m - 800m',
            participantSilhouettes: participants.map((p: any) => p.avatarRef || '/avatars/silhouette-1.svg'),
            isUserJoined,
            isUserCreator,
            status: m.status,
            safeDescription: m.safeDescription,
            isDemo: m.isDemo,
          });
        }

        return result;
      },
      async () => memoryMeetupStore.getAllMeetups(filters)
    );
  }

  public static async getMeetupById(
    meetupId: string,
    currentUserId?: string,
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [meetup] = await tx
          .select()
          .from(meetups)
          .where(eq(meetups.id, meetupId))
          .limit(1);

        if (!meetup) return null;

        const participants = await tx
          .select({
            id: meetupParticipants.id,
            userId: meetupParticipants.userId,
            role: meetupParticipants.role,
            status: meetupParticipants.status,
            joinedAt: meetupParticipants.joinedAt,
            checkedInAt: meetupParticipants.checkedInAt,
            displayName: profiles.displayName,
            avatarRef: profiles.avatarRef,
            reliabilityScore: profiles.reliabilityScore,
            ageBand: profiles.ageBand,
            showAgeBandAndInterests: profiles.showAgeBandAndInterests,
          })
          .from(meetupParticipants)
          .leftJoin(profiles, eq(meetupParticipants.userId, profiles.userId))
          .where(
            and(
              eq(meetupParticipants.meetupId, meetupId),
              inArray(meetupParticipants.status, ['joined', 'checked_in'])
            )
          );

        const act = DEMO_ACTIVITY_TYPES.find((a) => a.id === meetup.activityTypeId);
        const zone = DEMO_PUBLIC_ZONES.find((z) => z.id === meetup.zoneId);

        const isUserParticipant = currentUserId
          ? participants.some((p: any) => p.userId === currentUserId)
          : false;
        const isUserCreator = currentUserId ? meetup.creatorId === currentUserId : false;

        // Mask publicPlaceName for unjoined users
        const publicPlaceName = isUserParticipant || isUserCreator ? meetup.publicPlaceName : null;

        let messageList: any[] = [];
        if (isUserParticipant) {
          messageList = await tx
            .select({
              id: meetupMessages.id,
              senderId: meetupMessages.senderId,
              body: meetupMessages.body,
              createdAt: meetupMessages.createdAt,
              senderName: profiles.displayName,
              senderAvatar: profiles.avatarRef,
            })
            .from(meetupMessages)
            .leftJoin(profiles, eq(meetupMessages.senderId, profiles.userId))
            .where(
              and(
                eq(meetupMessages.meetupId, meetupId),
                isNull(meetupMessages.deletedAt),
                gt(meetupMessages.retentionExpiresAt, new Date())
              )
            )
            .orderBy(meetupMessages.createdAt);
        }

        return {
          meetup: {
            ...meetup,
            publicPlaceName,
            activityTitle: act?.title || meetup.activityTypeId,
            activityIcon: act?.icon || '🔥',
            zoneName: zone?.name || meetup.zoneId,
          },
          participants,
          messages: messageList,
          isUserParticipant,
          isUserCreator,
        };
      },
      async () => memoryMeetupStore.getMeetupById(meetupId, currentUserId)
    );
  }

  public static async createMeetup(
    data: {
      creatorId: string;
      activityTypeId: string;
      zoneId: string;
      publicPlaceName: string;
      startsInMinutes?: number;
      durationMinutes?: number;
      capacity?: number;
      safeDescription?: string;
      isDemo?: boolean;
    },
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const startsAt = new Date(Date.now() + (data.startsInMinutes || 15) * 60 * 1000);

        const [created] = await tx
          .insert(meetups)
          .values({
            creatorId: data.creatorId,
            activityTypeId: data.activityTypeId,
            zoneId: data.zoneId,
            publicPlaceName: data.publicPlaceName,
            startsAt,
            durationMinutes: data.durationMinutes || 60,
            capacity: data.capacity || 4,
            status: 'gathering',
            safeDescription: data.safeDescription || null,
            isDemo: data.isDemo ?? false,
          })
          .returning();

        // Insert creator as participant
        await tx.insert(meetupParticipants).values({
          meetupId: created.id,
          userId: data.creatorId,
          role: 'creator',
          status: 'joined',
        });

        return created;
      },
      async () => memoryMeetupStore.createMeetup(data)
    );
  }

  public static async joinMeetup(
    meetupId: string,
    userId: string,
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [meetup] = await tx
          .select()
          .from(meetups)
          .where(eq(meetups.id, meetupId))
          .limit(1);

        if (!meetup) {
          throw new Error('MEETUP_NOT_FOUND');
        }
        if (meetup.status !== 'gathering') {
          throw new Error('MEETUP_NOT_GATHERING');
        }

        const currentParticipants = await tx
          .select()
          .from(meetupParticipants)
          .where(
            and(
              eq(meetupParticipants.meetupId, meetupId),
              inArray(meetupParticipants.status, ['joined', 'checked_in'])
            )
          );

        // Check if already joined
        const alreadyJoined = currentParticipants.some((p: any) => p.userId === userId);
        if (alreadyJoined) {
          return { success: true, alreadyJoined: true };
        }

        if (currentParticipants.length >= meetup.capacity) {
          throw new Error('CAPACITY_FULL');
        }

        await tx.insert(meetupParticipants).values({
          meetupId,
          userId,
          role: 'participant',
          status: 'joined',
        });

        return { success: true, alreadyJoined: false };
      },
      async () => memoryMeetupStore.joinMeetup(meetupId, userId)
    );
  }

  public static async leaveMeetup(
    meetupId: string,
    userId: string,
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        await tx
          .update(meetupParticipants)
          .set({
            status: 'left',
            leftAt: new Date(),
          })
          .where(
            and(
              eq(meetupParticipants.meetupId, meetupId),
              eq(meetupParticipants.userId, userId)
            )
          );
      },
      async () => {
        memoryMeetupStore.leaveMeetup(meetupId, userId);
      }
    );
  }

  public static async checkInParticipant(
    meetupId: string,
    userId: string,
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        await tx
          .update(meetupParticipants)
          .set({
            status: 'checked_in',
            checkedInAt: new Date(),
          })
          .where(
            and(
              eq(meetupParticipants.meetupId, meetupId),
              eq(meetupParticipants.userId, userId)
            )
          );

        const checkedInCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(meetupParticipants)
          .where(
            and(
              eq(meetupParticipants.meetupId, meetupId),
              eq(meetupParticipants.status, 'checked_in')
            )
          );

        if (Number(checkedInCount[0]?.count || 0) >= 2) {
          await tx
            .update(meetups)
            .set({ status: 'active', updatedAt: new Date() })
            .where(and(eq(meetups.id, meetupId), eq(meetups.status, 'gathering')));
        }
      },
      async () => {
        memoryMeetupStore.checkInParticipant(meetupId, userId);
      }
    );
  }

  public static async completeMeetup(
    meetupId: string,
    userId: string,
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [meetup] = await tx
          .select()
          .from(meetups)
          .where(eq(meetups.id, meetupId))
          .limit(1);

        if (!meetup) {
          throw new Error('MEETUP_NOT_FOUND');
        }

        if (meetup.creatorId !== userId) {
          throw new Error('FORBIDDEN_NOT_CREATOR');
        }

        const [updated] = await tx
          .update(meetups)
          .set({
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(meetups.id, meetupId))
          .returning();

        return updated;
      },
      async () => memoryMeetupStore.completeMeetup(meetupId, userId)
    );
  }

  public static async addMessage(
    meetupId: string,
    senderId: string,
    body: string,
    retentionHours = 12,
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const retentionExpiresAt = new Date(Date.now() + retentionHours * 60 * 60 * 1000);

        const [msg] = await tx
          .insert(meetupMessages)
          .values({
            meetupId,
            senderId,
            body,
            moderationStatus: 'approved',
            retentionExpiresAt,
          })
          .returning();

        return msg;
      },
      async () => memoryMeetupStore.addMessage(meetupId, senderId, body, retentionHours)
    );
  }

  public static async addBlock(
    blockerId: string,
    blockedId: string,
    reason?: string,
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [b] = await tx
          .insert(blocks)
          .values({
            blockerId,
            blockedId,
            reason: reason || null,
          })
          .returning();
        return b;
      },
      async () => memoryMeetupStore.addBlock(blockerId, blockedId, reason)
    );
  }

  public static async addReport(
    data: {
      meetupId?: string;
      reporterId: string;
      targetId?: string;
      category: any;
      description: string;
      priority?: any;
    },
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [rep] = await tx
          .insert(reports)
          .values({
            meetupId: data.meetupId || null,
            reporterId: data.reporterId,
            targetId: data.targetId || null,
            category: data.category,
            description: data.description,
            priority: data.priority || 'p2_medium',
          })
          .returning();
        return rep;
      },
      async () => memoryMeetupStore.addReport(data)
    );
  }

  public static async addSafetyEvent(
    data: {
      meetupId?: string;
      reporterId: string;
      eventType?: string;
      approximateLocation?: any;
    },
    tx: any = defaultDb
  ) {
    return executeWithDb(
      tx,
      async () => {
        const [event] = await tx
          .insert(safetyEvents)
          .values({
            meetupId: data.meetupId || null,
            reporterId: data.reporterId,
            eventType: data.eventType || 'safety_help',
            approximateLocation: data.approximateLocation || null,
          })
          .returning();
        return event;
      },
      async () => memoryMeetupStore.addSafetyEvent(data)
    );
  }
}
