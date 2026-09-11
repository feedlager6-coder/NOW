import { DEMO_USERS, DEMO_ACTIVITY_TYPES, DEMO_PUBLIC_ZONES } from '@/lib/demo-data';
import { serializeAnonymousDiscovery, AnonymousDiscoveryCard } from '@/domain/safety-guard';

export interface DemoMeetupItem {
  id: string;
  creatorId: string;
  activityTypeId: string;
  zoneId: string;
  publicPlaceName: string;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  status: 'draft' | 'scheduled' | 'gathering' | 'active' | 'completed' | 'cancelled_by_creator' | 'cancelled_by_system' | 'safety_review' | 'archived';
  safeDescription: string;
  participantIds: string[];
  checkedInUserIds: string[];
  createdAt: Date;
  endedAt?: Date;
}

export interface DemoChatMessage {
  id: string;
  meetupId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface DemoReport {
  id: string;
  meetupId: string;
  reporterId: string;
  targetId?: string;
  category: string;
  description: string;
  createdAt: Date;
}

export interface DemoSafetyEvent {
  id: string;
  meetupId: string;
  reporterId: string;
  eventType: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

// Initial in-memory demo flames
const now = Date.now();
const INITIAL_DEMO_MEETUPS: DemoMeetupItem[] = [
  {
    id: 'meetup-flame-1',
    creatorId: DEMO_USERS[0].id,
    activityTypeId: 'board_games',
    zoneId: 'DEMO_ZONE_CENTER',
    publicPlaceName: 'Центральный сквер у фонтана',
    startsAt: new Date(now + 15 * 60 * 1000),
    durationMinutes: 90,
    capacity: 4,
    status: 'gathering',
    safeDescription: 'Партия в Catan и Каркассон. Ищем еще одного игрока!',
    participantIds: [DEMO_USERS[0].id, DEMO_USERS[1].id, DEMO_USERS[2].id],
    checkedInUserIds: [],
    createdAt: new Date(now - 10 * 60 * 1000),
  },
  {
    id: 'meetup-flame-2',
    creatorId: DEMO_USERS[1].id,
    activityTypeId: 'coffee',
    zoneId: 'DEMO_ZONE_NORTH',
    publicPlaceName: 'Открытая веранда кофейни',
    startsAt: new Date(now + 25 * 60 * 1000),
    durationMinutes: 45,
    capacity: 4,
    status: 'gathering',
    safeDescription: 'Кофе на 40 минут. Обсуждаем IT, стартапы и пет-проекты.',
    participantIds: [DEMO_USERS[1].id, DEMO_USERS[0].id],
    checkedInUserIds: [],
    createdAt: new Date(now - 5 * 60 * 1000),
  },
  {
    id: 'meetup-flame-3',
    creatorId: DEMO_USERS[2].id,
    activityTypeId: 'football',
    zoneId: 'DEMO_ZONE_SPORT',
    publicPlaceName: 'Открытое поле с искусственным газоном',
    startsAt: new Date(now + 35 * 60 * 1000),
    durationMinutes: 90,
    capacity: 10,
    status: 'gathering',
    safeDescription: 'Играем 5х5. Нужны еще люди для двух полных составов!',
    participantIds: [DEMO_USERS[2].id, DEMO_USERS[3].id, DEMO_USERS[0].id, DEMO_USERS[1].id, 'demo-p-5'],
    checkedInUserIds: [],
    createdAt: new Date(now - 20 * 60 * 1000),
  },
  {
    id: 'meetup-flame-4',
    creatorId: DEMO_USERS[3].id,
    activityTypeId: 'walking',
    zoneId: 'DEMO_ZONE_PARK',
    publicPlaceName: 'Центральная аллея парка',
    startsAt: new Date(now + 20 * 60 * 1000),
    durationMinutes: 60,
    capacity: 5,
    status: 'gathering',
    safeDescription: 'Пешая прогулка по парку 5 км в комфортном темпе.',
    participantIds: [DEMO_USERS[3].id, DEMO_USERS[0].id, DEMO_USERS[1].id],
    checkedInUserIds: [],
    createdAt: new Date(now - 15 * 60 * 1000),
  },
  {
    id: 'meetup-flame-5',
    creatorId: DEMO_USERS[0].id,
    activityTypeId: 'workout',
    zoneId: 'DEMO_ZONE_RIVER',
    publicPlaceName: 'Воркаут-площадка на набережной',
    startsAt: new Date(now + 40 * 60 * 1000),
    durationMinutes: 45,
    capacity: 5,
    status: 'gathering',
    safeDescription: 'Легкий кросс и турники на свежем воздухе у воды.',
    participantIds: [DEMO_USERS[0].id, DEMO_USERS[3].id, DEMO_USERS[2].id, DEMO_USERS[1].id],
    checkedInUserIds: [],
    createdAt: new Date(now - 8 * 60 * 1000),
  },
  {
    id: 'meetup-flame-6',
    creatorId: DEMO_USERS[1].id,
    activityTypeId: 'study',
    zoneId: 'DEMO_ZONE_CENTER',
    publicPlaceName: 'Открытый коворкинг / библиотека',
    startsAt: new Date(now + 50 * 60 * 1000),
    durationMinutes: 60,
    capacity: 4,
    status: 'gathering',
    safeDescription: 'Совместный кодинг и подготовка к собеседованиям.',
    participantIds: [DEMO_USERS[1].id, DEMO_USERS[2].id],
    checkedInUserIds: [],
    createdAt: new Date(now - 2 * 60 * 1000),
  },
  {
    id: 'meetup-flame-7',
    creatorId: DEMO_USERS[2].id,
    activityTypeId: 'sports_viewing',
    zoneId: 'DEMO_ZONE_SPORT',
    publicPlaceName: 'Спорт-зона с экраном',
    startsAt: new Date(now + 75 * 60 * 1000),
    durationMinutes: 120,
    capacity: 6,
    status: 'gathering',
    safeDescription: 'Смотрим турнир UFC. Чай и безалкогольные напитки.',
    participantIds: [DEMO_USERS[2].id, DEMO_USERS[0].id, DEMO_USERS[1].id, DEMO_USERS[3].id],
    checkedInUserIds: [],
    createdAt: new Date(now - 25 * 60 * 1000),
  },
];

class DemoStore {
  private meetups: Map<string, DemoMeetupItem> = new Map();
  private messages: Map<string, DemoChatMessage[]> = new Map(); // meetupId -> messages
  private blocks: Array<{ blockerId: string; blockedId: string }> = [];
  private reports: DemoReport[] = [];
  private safetyEvents: DemoSafetyEvent[] = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.meetups.clear();
    this.messages.clear();
    for (const m of INITIAL_DEMO_MEETUPS) {
      this.meetups.set(m.id, {
        ...m,
        participantIds: [...m.participantIds],
        checkedInUserIds: [],
      });
      // Initial greeting message for each meetup
      this.messages.set(m.id, [
        {
          id: `msg-init-${m.id}`,
          meetupId: m.id,
          senderId: m.creatorId,
          senderName: DEMO_USERS.find((u) => u.id === m.creatorId)?.displayName || 'Создатель',
          body: 'Привет всем! Встречаемся в публичной зоне.',
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      ]);
    }
    this.blocks = [];
    this.reports = [];
    this.safetyEvents = [];
  }

  public getAll(filters?: { category?: string; zoneId?: string; currentUserId?: string }): AnonymousDiscoveryCard[] {
    let list = Array.from(this.meetups.values());

    // Filter by active statuses
    list = list.filter((m) => m.status === 'gathering' || m.status === 'active');

    if (filters?.category && filters.category !== 'all') {
      list = list.filter((m) => m.activityTypeId === filters.category);
    }

    if (filters?.zoneId && filters.zoneId !== 'all') {
      list = list.filter((m) => m.zoneId === filters.zoneId);
    }

    if (filters?.currentUserId) {
      const uId = filters.currentUserId;
      list = list.filter((m) => {
        const creatorBlocked = this.blocks.some(
          (b) =>
            (b.blockerId === uId && b.blockedId === m.creatorId) ||
            (b.blockerId === m.creatorId && b.blockedId === uId)
        );
        if (creatorBlocked) return false;

        const hasBlockedParticipant = m.participantIds.some((pId) =>
          this.blocks.some(
            (b) =>
              (b.blockerId === uId && b.blockedId === pId) ||
              (b.blockerId === pId && b.blockedId === uId)
          )
        );
        return !hasBlockedParticipant;
      });
    }

    list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return list.map((m) => this.serializeMeetup(m));
  }

  public getById(id: string): DemoMeetupItem | undefined {
    return this.meetups.get(id);
  }

  public serializeMeetup(m: DemoMeetupItem): AnonymousDiscoveryCard {
    const act = DEMO_ACTIVITY_TYPES.find((a) => a.id === m.activityTypeId) || {
      title: 'Активность',
      icon: '🔥',
    };
    const zone = DEMO_PUBLIC_ZONES.find((z) => z.id === m.zoneId) || {
      name: m.zoneId,
    };

    const participants = m.participantIds.map((pId, idx) => {
      const u = DEMO_USERS.find((usr) => usr.id === pId);
      return {
        ageBand: u?.ageBand || '18+',
        avatarRef: u?.avatarRef || `/avatars/silhouette-${(idx % 4) + 1}.svg`,
        reliabilityScore: u?.reliabilityScore || 100,
      };
    });

    return serializeAnonymousDiscovery({
      meetup: m,
      activityType: act,
      zone,
      distanceKm: 0.5,
      participants,
    });
  }

  public create(data: {
    creatorId: string;
    activityTypeId: string;
    zoneId: string;
    publicPlaceName: string;
    startsInMinutes: number;
    capacity: number;
    safeDescription?: string;
  }): DemoMeetupItem {
    const id = `meetup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startsAt = new Date(Date.now() + data.startsInMinutes * 60 * 1000);

    const item: DemoMeetupItem = {
      id,
      creatorId: data.creatorId,
      activityTypeId: data.activityTypeId,
      zoneId: data.zoneId,
      publicPlaceName: data.publicPlaceName,
      startsAt,
      durationMinutes: 60,
      capacity: data.capacity,
      status: 'gathering',
      safeDescription: data.safeDescription || 'Спонтанная активность в публичной зоне',
      participantIds: [data.creatorId],
      checkedInUserIds: [],
      createdAt: new Date(),
    };

    this.meetups.set(id, item);
    this.messages.set(id, [
      {
        id: `msg-welcome-${id}`,
        meetupId: id,
        senderId: data.creatorId,
        senderName: DEMO_USERS.find((u) => u.id === data.creatorId)?.displayName || 'Организатор',
        body: 'Огонёк создан! Присоединяйтесь в чат.',
        createdAt: new Date().toISOString(),
      },
    ]);

    return item;
  }

  public join(meetupId: string, userId: string): { success: boolean; error?: string; meetup?: DemoMeetupItem } {
    const item = this.meetups.get(meetupId);
    if (!item) {
      return { success: false, error: 'MEETUP_NOT_FOUND' };
    }

    if (item.status === 'completed' || item.status === 'cancelled_by_creator' || item.status === 'cancelled_by_system') {
      return { success: false, error: 'MEETUP_INACTIVE' };
    }

    if (item.participantIds.includes(userId)) {
      return { success: false, error: 'ALREADY_JOINED' };
    }

    // Atomic capacity check
    if (item.participantIds.length >= item.capacity) {
      return { success: false, error: 'CAPACITY_REACHED' };
    }

    // Mutual block check
    const isBlocked = item.participantIds.some((pId) =>
      this.blocks.some(
        (b) =>
          (b.blockerId === userId && b.blockedId === pId) ||
          (b.blockerId === pId && b.blockedId === userId)
      )
    );
    if (isBlocked) {
      return { success: false, error: 'SAFETY_RESTRICTION' };
    }

    item.participantIds.push(userId);

    // Auto promote to active if startsAt has arrived
    if (new Date() >= item.startsAt && item.participantIds.length >= 2 && item.status === 'gathering') {
      item.status = 'active';
    }

    return { success: true, meetup: item };
  }

  public leave(meetupId: string, userId: string): { success: boolean; error?: string; meetup?: DemoMeetupItem } {
    const item = this.meetups.get(meetupId);
    if (!item) {
      return { success: false, error: 'MEETUP_NOT_FOUND' };
    }

    item.participantIds = item.participantIds.filter((id) => id !== userId);
    item.checkedInUserIds = item.checkedInUserIds.filter((id) => id !== userId);
    return { success: true, meetup: item };
  }

  public checkIn(meetupId: string, userId: string): { success: boolean; error?: string; meetup?: DemoMeetupItem } {
    const item = this.meetups.get(meetupId);
    if (!item) {
      return { success: false, error: 'MEETUP_NOT_FOUND' };
    }

    if (!item.participantIds.includes(userId)) {
      return { success: false, error: 'NOT_A_PARTICIPANT' };
    }

    if (!item.checkedInUserIds.includes(userId)) {
      item.checkedInUserIds.push(userId);
    }

    return { success: true, meetup: item };
  }

  public setStatus(meetupId: string, newStatus: DemoMeetupItem['status']): { success: boolean; error?: string; meetup?: DemoMeetupItem } {
    const item = this.meetups.get(meetupId);
    if (!item) {
      return { success: false, error: 'MEETUP_NOT_FOUND' };
    }

    item.status = newStatus;
    if (newStatus === 'completed') {
      item.endedAt = new Date();
    }
    return { success: true, meetup: item };
  }

  public complete(meetupId: string, actorId?: string): { success: boolean; error?: string; meetup?: DemoMeetupItem } {
    const item = this.meetups.get(meetupId);
    if (!item) {
      return { success: false, error: 'MEETUP_NOT_FOUND' };
    }

    if (actorId && actorId !== item.creatorId) {
      return { success: false, error: 'ONLY_CREATOR_CAN_COMPLETE' };
    }

    item.status = 'completed';
    item.endedAt = new Date();
    return { success: true, meetup: item };
  }

  // --- CHAT LOGIC ---
  public getMessages(meetupId: string, userId: string): { success: boolean; error?: string; messages?: DemoChatMessage[] } {
    const item = this.meetups.get(meetupId);
    if (!item) {
      return { success: false, error: 'MEETUP_NOT_FOUND' };
    }

    if (!item.participantIds.includes(userId)) {
      return { success: false, error: 'FORBIDDEN_NOT_PARTICIPANT' };
    }

    const msgs = this.messages.get(meetupId) || [];
    return { success: true, messages: msgs };
  }

  public addMessage(meetupId: string, senderId: string, text: string): { success: boolean; error?: string; message?: DemoChatMessage } {
    const item = this.meetups.get(meetupId);
    if (!item) {
      return { success: false, error: 'MEETUP_NOT_FOUND' };
    }

    if (!item.participantIds.includes(senderId)) {
      return { success: false, error: 'FORBIDDEN_NOT_PARTICIPANT' };
    }

    // Basic plain text sanitization (strip HTML tags)
    const sanitized = text.replace(/<[^>]*>?/gm, '').trim();
    if (!sanitized) {
      return { success: false, error: 'EMPTY_MESSAGE' };
    }

    if (sanitized.length > 200) {
      return { success: false, error: 'MESSAGE_TOO_LONG' };
    }

    // Forbidden solicitation check
    const lower = sanitized.toLowerCase();
    const forbidden = ['оплата', 'рублей', 'номер карты', 'секс', 'интим', 'номер телефона', 'встретимся дома', 'поехали ко мне'];
    if (forbidden.some((w) => lower.includes(w))) {
      return { success: false, error: 'FORBIDDEN_CONTENT' };
    }

    const sender = DEMO_USERS.find((u) => u.id === senderId);
    const msg: DemoChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      meetupId,
      senderId,
      senderName: sender?.displayName || 'Участник',
      body: sanitized,
      createdAt: new Date().toISOString(),
    };

    const msgs = this.messages.get(meetupId) || [];
    msgs.push(msg);
    this.messages.set(meetupId, msgs);

    return { success: true, message: msg };
  }

  // --- SAFETY, REPORT, BLOCK ---
  public addReport(data: { meetupId: string; reporterId: string; targetId?: string; category: string; description: string }): DemoReport {
    const report: DemoReport = {
      id: `rep-${Date.now()}`,
      meetupId: data.meetupId,
      reporterId: data.reporterId,
      targetId: data.targetId,
      category: data.category,
      description: data.description.replace(/<[^>]*>?/gm, '').trim(),
      createdAt: new Date(),
    };
    this.reports.push(report);
    return report;
  }

  public addBlock(blockerId: string, blockedId: string): boolean {
    if (blockerId === blockedId) return false;
    const exists = this.blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId);
    if (!exists) {
      this.blocks.push({ blockerId, blockedId });
    }
    return true;
  }

  public addSafetyEvent(data: { meetupId: string; reporterId: string; eventType: string; details?: Record<string, unknown> }): DemoSafetyEvent {
    const event: DemoSafetyEvent = {
      id: `safe-${Date.now()}`,
      meetupId: data.meetupId,
      reporterId: data.reporterId,
      eventType: data.eventType,
      details: data.details,
      createdAt: new Date(),
    };
    this.safetyEvents.push(event);
    return event;
  }

  // --- SHARE CARD ---
  public getShareCardData(meetupId: string): { success: boolean; card?: Record<string, unknown>; error?: string } {
    const item = this.meetups.get(meetupId);
    if (!item) {
      return { success: false, error: 'MEETUP_NOT_FOUND' };
    }

    const act = DEMO_ACTIVITY_TYPES.find((a) => a.id === item.activityTypeId);
    const zone = DEMO_PUBLIC_ZONES.find((z) => z.id === item.zoneId);

    const started = new Date(item.startsAt).getTime();
    const ended = item.endedAt ? new Date(item.endedAt).getTime() : Date.now();
    const durationMinutes = Math.max(15, Math.round((ended - started) / 60000)) || item.durationMinutes;

    return {
      success: true,
      card: {
        id: item.id,
        logo: 'NOW / IRL',
        city: 'DEMO CITY',
        activityTitle: act?.title || 'Активность',
        activityIcon: act?.icon || '🔥',
        zoneName: zone?.name || 'Публичная зона',
        headline: 'Компания собрана!',
        participantCount: item.participantIds.length,
        durationMinutes,
        status: item.status,
        dateFormatted: new Date(item.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
      },
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __demoStore: DemoStore | undefined;
}

export const demoStore = global.__demoStore || new DemoStore();
if (process.env.NODE_ENV !== 'production') {
  global.__demoStore = demoStore;
}
