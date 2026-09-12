import { describe, it, expect } from 'vitest';
import { mapProvider, SAFE_MEETING_POINTS } from '@/domain/map/map-provider';
import { navigationLinkProvider } from '@/domain/map/navigation-link-provider';
import { serializeAnonymousDiscovery } from '@/domain/safety-guard';
import { MeetupRepository } from '@/repositories/meetup-repository';

describe('Map Location & Meeting Point Safety Unit Tests', () => {
  it('should provide pre-approved safe meeting points from catalog', async () => {
    const points = await mapProvider.getMeetingPoints('DEMO_ZONE_CENTER');
    expect(points.length).toBeGreaterThanOrEqual(5);

    const labels = points.map((p) => p.label);
    expect(labels).toContain('Главный вход');
    expect(labels).toContain('У фонтана');
    expect(labels).toContain('Центральная площадка');
    expect(labels).toContain('У спортивной зоны');
    expect(labels).toContain('Возле инфостенда');
  });

  it('should accept approved catalog labels and reject arbitrary private addresses', () => {
    const valid = mapProvider.validateMeetingPoint('DEMO_ZONE_CENTER', 'У фонтана');
    expect(valid.valid).toBe(true);
    expect(valid.label).toBe('У фонтана');

    // Reject private home address or random text
    const privateAddress = mapProvider.validateMeetingPoint('DEMO_ZONE_CENTER', 'ул. Ленина д. 15 кв. 42');
    expect(privateAddress.valid).toBe(false);

    const empty = mapProvider.validateMeetingPoint('DEMO_ZONE_CENTER', '   ');
    expect(empty.valid).toBe(false);
  });

  it('should never leak coordinates or exact meeting point in anonymous discovery serialization', () => {
    const card = serializeAnonymousDiscovery({
      meetup: {
        id: 'test-meetup-101',
        activityTypeId: 'walk',
        zoneId: 'DEMO_ZONE_CENTER',
        startsAt: new Date(Date.now() + 30 * 60 * 1000),
        durationMinutes: 60,
        capacity: 4,
        safeDescription: 'Тестовая прогулка',
      },
      activityType: { title: 'Прогулки', icon: '🚶' },
      zone: { name: 'Центральный парк' },
      distanceKm: 0.35,
      participants: [{ ageBand: '22-25', reliabilityScore: 100 }],
    });

    // Public place name must NOT be present on public discovery cards
    expect((card as any).publicPlaceName).toBeUndefined();
    // Exact GPS coordinates must NOT be present
    expect((card as any).lat).toBeUndefined();
    expect((card as any).lng).toBeUndefined();
    expect((card as any).approximateLat).toBeUndefined();
    expect((card as any).approximateLng).toBeUndefined();

    // Zone name and fuzzy distance band must be present
    expect(card.zoneName).toBe('Центральный парк');
    expect(card.distanceBand).toBeDefined();
  });

  it('should enforce selective meeting point visibility in repository (hidden before join, revealed after join)', async () => {
    const creatorId = 'creator-loc-01';
    const guestId = 'guest-loc-02';

    // 1. Create meetup
    const created = await MeetupRepository.createMeetup({
      creatorId,
      activityTypeId: 'coffee',
      zoneId: 'DEMO_ZONE_NORTH',
      publicPlaceName: 'У фонтана',
      capacity: 4,
    });

    // 2. Creator should see the meeting point
    const creatorView = await MeetupRepository.getMeetupById(created.id, creatorId);
    expect(creatorView?.meetup.publicPlaceName).toBe('У фонтана');
    expect(creatorView?.isUserCreator).toBe(true);

    // 3. Unjoined guest should NOT see the meeting point (masked to null)
    const guestPreJoinView = await MeetupRepository.getMeetupById(created.id, guestId);
    expect(guestPreJoinView?.meetup.publicPlaceName).toBeNull();
    expect(guestPreJoinView?.isUserParticipant).toBe(false);

    // 4. Guest joins
    await MeetupRepository.joinMeetup(created.id, guestId);

    // 5. Joined guest should now see the meeting point
    const guestPostJoinView = await MeetupRepository.getMeetupById(created.id, guestId);
    expect(guestPostJoinView?.meetup.publicPlaceName).toBe('У фонтана');
    expect(guestPostJoinView?.isUserParticipant).toBe(true);
  });

  it('should return disabled navigation links with clear explanation in prototype phase', () => {
    expect(navigationLinkProvider.isAvailable()).toBe(false);
    expect(
      navigationLinkProvider.getYandexMapsUrl(SAFE_MEETING_POINTS.DEFAULT[0])
    ).toBeNull();
    expect(
      navigationLinkProvider.get2GisUrl(SAFE_MEETING_POINTS.DEFAULT[0])
    ).toBeNull();
    expect(navigationLinkProvider.getPlaceholderExplanation()).toContain(
      'Маршрут станет доступен после подключения карты'
    );
  });
});
