export interface BlockRecord {
  blockerId: string;
  blockedId: string;
}

export function areUsersMutuallyBlocked(
  userAId: string,
  userBId: string,
  activeBlocks: BlockRecord[]
): boolean {
  if (userAId === userBId) return false;

  return activeBlocks.some(
    (b) =>
      (b.blockerId === userAId && b.blockedId === userBId) ||
      (b.blockerId === userBId && b.blockedId === userAId)
  );
}

export function filterMeetupsForUser<T extends { creatorId: string; id: string }>(
  meetups: T[],
  currentUserId: string,
  activeBlocks: BlockRecord[],
  meetupParticipantsMap?: Record<string, string[]> // meetupId -> userIds
): T[] {
  return meetups.filter((m) => {
    // 1. Check if creator is blocked
    if (areUsersMutuallyBlocked(currentUserId, m.creatorId, activeBlocks)) {
      return false;
    }

    // 2. Check if any existing participant is blocked
    if (meetupParticipantsMap && meetupParticipantsMap[m.id]) {
      const participantIds = meetupParticipantsMap[m.id];
      const hasBlockedParticipant = participantIds.some((pId) =>
        areUsersMutuallyBlocked(currentUserId, pId, activeBlocks)
      );
      if (hasBlockedParticipant) {
        return false;
      }
    }

    return true;
  });
}

export function formatDistanceBand(distanceKm: number | null | undefined): string {
  if (distanceKm == null || isNaN(distanceKm)) {
    return 'в вашем районе';
  }
  if (distanceKm < 0.5) return 'до 500 м';
  if (distanceKm <= 1.0) return 'до 1 км';
  if (distanceKm <= 3.0) return '1–3 км';
  return 'более 3 км';
}

export interface AnonymousParticipantSilhouette {
  avatarRef: string;
  ageBand: string;
  reliabilityScore: number;
}

export interface AnonymousDiscoveryCard {
  id: string;
  activityTypeId: string;
  activityTitle: string;
  activityIcon: string;
  zoneId: string;
  zoneName: string;
  distanceBand: string;
  startsAt: string;
  startsInMinutes: number;
  durationMinutes: number;
  capacity: number;
  occupiedSlots: number;
  safeDescription: string;
  participantSilhouettes: AnonymousParticipantSilhouette[];
}

export function serializeAnonymousDiscovery(params: {
  meetup: {
    id: string;
    activityTypeId: string;
    zoneId: string;
    startsAt: Date;
    durationMinutes: number;
    capacity: number;
    safeDescription?: string | null;
  };
  activityType: {
    title: string;
    icon: string;
  };
  zone: {
    name: string;
  };
  distanceKm?: number;
  participants: Array<{
    ageBand?: string | null;
    avatarRef?: string | null;
    reliabilityScore?: number | null;
  }>;
}): AnonymousDiscoveryCard {
  const now = Date.now();
  const startsAtMs = new Date(params.meetup.startsAt).getTime();
  const startsInMinutes = Math.max(0, Math.round((startsAtMs - now) / 60000));

  return {
    id: params.meetup.id,
    activityTypeId: params.meetup.activityTypeId,
    activityTitle: params.activityType.title,
    activityIcon: params.activityType.icon,
    zoneId: params.meetup.zoneId,
    zoneName: params.zone.name,
    distanceBand: formatDistanceBand(params.distanceKm),
    startsAt: new Date(params.meetup.startsAt).toISOString(),
    startsInMinutes,
    durationMinutes: params.meetup.durationMinutes,
    capacity: params.meetup.capacity,
    occupiedSlots: params.participants.length,
    safeDescription: params.meetup.safeDescription || 'Спонтанная встреча в публичной зоне',
    participantSilhouettes: params.participants.map((p, idx) => ({
      avatarRef: p.avatarRef || `/avatars/silhouette-${(idx % 4) + 1}.svg`,
      ageBand: p.ageBand || '18+',
      reliabilityScore: p.reliabilityScore ?? 100,
    })),
  };
}

export class SafetyGuard {
  public static validateMessageContent(text: string): { valid: boolean; sanitized?: string; reason?: string } {
    const sanitized = text.replace(/<[^>]*>?/gm, '').trim();
    if (!sanitized) {
      return { valid: false, reason: 'Сообщение не может быть пустым' };
    }
    if (sanitized.length > 200) {
      return { valid: false, reason: 'Максимальная длина сообщения — 200 символов' };
    }
    const lower = sanitized.toLowerCase();
    const forbidden = ['оплата', 'рублей', 'номер карты', 'секс', 'интим', 'номер телефона', 'встретимся дома', 'поехали ко мне'];
    if (forbidden.some((w) => lower.includes(w))) {
      return { valid: false, reason: 'Запрещены коммерческие предложения, интим и приватные локации' };
    }
    return { valid: true, sanitized };
  }
}

