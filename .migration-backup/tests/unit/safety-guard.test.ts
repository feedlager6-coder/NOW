import { describe, it, expect } from 'vitest';
import {
  areUsersMutuallyBlocked,
  filterMeetupsForUser,
  formatDistanceBand,
  serializeAnonymousDiscovery,
} from '@/domain/safety-guard';

describe('Safety Guard & Privacy Isolation Tests', () => {
  it('should detect mutual blocks in both directions', () => {
    const blocks = [{ blockerId: 'user-A', blockedId: 'user-B' }];

    expect(areUsersMutuallyBlocked('user-A', 'user-B', blocks)).toBe(true);
    expect(areUsersMutuallyBlocked('user-B', 'user-A', blocks)).toBe(true);
    expect(areUsersMutuallyBlocked('user-A', 'user-C', blocks)).toBe(false);
  });

  it('should filter out meetups created by or containing blocked users', () => {
    const meetups = [
      { id: 'm-1', creatorId: 'user-B' }, // Created by blocked user
      { id: 'm-2', creatorId: 'user-C' }, // Created by clean user, but B is participant
      { id: 'm-3', creatorId: 'user-D' }, // Clean meetup
    ];

    const blocks = [{ blockerId: 'user-A', blockedId: 'user-B' }];
    const participantsMap = {
      'm-1': ['user-B'],
      'm-2': ['user-C', 'user-B'],
      'm-3': ['user-D', 'user-E'],
    };

    const visibleMeetups = filterMeetupsForUser(
      meetups,
      'user-A',
      blocks,
      participantsMap
    );

    expect(visibleMeetups).toHaveLength(1);
    expect(visibleMeetups[0].id).toBe('m-3');
  });

  it('should format distance bands without exposing raw GPS coordinates', () => {
    expect(formatDistanceBand(0.3)).toBe('до 500 м');
    expect(formatDistanceBand(0.8)).toBe('до 1 км');
    expect(formatDistanceBand(2.5)).toBe('1–3 км');
    expect(formatDistanceBand(5.0)).toBe('более 3 км');
    expect(formatDistanceBand(null)).toBe('в вашем районе');
  });

  it('should serialize anonymous discovery cards without leaking PII or exact locations', () => {
    const card = serializeAnonymousDiscovery({
      meetup: {
        id: 'meetup-123',
        activityTypeId: 'coffee',
        zoneId: 'DEMO_PUBLIC_ZONE_1',
        startsAt: new Date(Date.now() + 20 * 60 * 1000),
        durationMinutes: 45,
        capacity: 4,
        safeDescription: 'Обсуждаем книги за кофе',
      },
      activityType: {
        title: 'Кофе и разговор',
        icon: 'Coffee',
      },
      zone: {
        name: 'Вымышленная набережная',
      },
      distanceKm: 0.4,
      participants: [
        { ageBand: '22-25', reliabilityScore: 99 },
        { ageBand: '18-21', reliabilityScore: 100 },
      ],
    });

    expect(card.id).toBe('meetup-123');
    expect(card.distanceBand).toBe('до 500 м');
    expect(card.occupiedSlots).toBe(2);
    expect(card.capacity).toBe(4);
    expect(card.participantSilhouettes).toHaveLength(2);
    expect(card.participantSilhouettes[0].ageBand).toBe('22-25');
    // Ensure raw GPS coordinates or private identifiers are not on the card
    expect(card).not.toHaveProperty('approximateLat');
    expect(card).not.toHaveProperty('approximateLng');
    expect(card).not.toHaveProperty('phone');
    expect(card).not.toHaveProperty('realName');
  });
});
