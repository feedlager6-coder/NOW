import { describe, it, expect, beforeAll } from 'vitest';
import { MeetupRepository } from '@/repositories/meetup-repository';
import { demoStore } from '@/lib/demo-store';

describe('Local Test Meetups & Persistence Integration Tests', () => {
  const testCreatorId = 'creator-local-integ-01';
  const testUser2Id = 'user-local-integ-02';
  const testUser3Id = 'user-local-integ-03';
  const testBlockedId = 'blocked-local-integ-04';

  let localMeetupId: string;

  beforeAll(async () => {
    // 1. Create a local test meetup
    const created = await MeetupRepository.createMeetup({
      creatorId: testCreatorId,
      activityTypeId: 'coffee',
      zoneId: 'DEMO_ZONE_CENTER',
      publicPlaceName: 'У фонтана',
      capacity: 2, // Strict limit for capacity testing
      safeDescription: 'Тестовый огонёк кофе',
    });
    localMeetupId = created.id;
  });

  it('should isolate Local Test meetups from in-memory DEMO store', () => {
    // Meetup created in MeetupRepository should NOT exist in demoStore
    const inDemoStore = demoStore.getById(localMeetupId);
    expect(inDemoStore).toBeUndefined();

    // DEMO meetups in demoStore should have demo IDs
    const demoCards = demoStore.getAll({});
    expect(demoCards.every((d) => d.id !== localMeetupId)).toBe(true);
  });

  it('should prevent joining when capacity is reached (capacity race protection)', async () => {
    // Slot 1: Creator already occupied slot 1 (capacity = 2)
    // Slot 2: testUser2 joins
    const join2 = await MeetupRepository.joinMeetup(localMeetupId, testUser2Id);
    expect(join2.success).toBe(true);
    expect(join2.alreadyJoined).toBe(false);

    // Slot 3: testUser3 attempts to join -> should throw CAPACITY_FULL
    await expect(
      MeetupRepository.joinMeetup(localMeetupId, testUser3Id)
    ).rejects.toThrow('CAPACITY_FULL');
  });

  it('should prevent duplicate join for the same user', async () => {
    // testUser2 attempts to join again
    const dupeJoin = await MeetupRepository.joinMeetup(localMeetupId, testUser2Id);
    expect(dupeJoin.success).toBe(true);
    expect(dupeJoin.alreadyJoined).toBe(true);
  });

  it('should enforce chat isolation: non-participants cannot send messages', async () => {
    // Participant sends message
    const msg = await MeetupRepository.addMessage(
      localMeetupId,
      testUser2Id,
      'Привет! Я на месте.'
    );
    expect(msg.id).toBeDefined();
    expect(msg.body).toBe('Привет! Я на месте.');

    // Non-participant attempts to send message -> should throw FORBIDDEN_NOT_PARTICIPANT
    await expect(
      MeetupRepository.addMessage(
        localMeetupId,
        testUser3Id,
        'Я не участник, пустите!'
      )
    ).rejects.toThrow('FORBIDDEN_NOT_PARTICIPANT');
  });

  it('should hide meetups from listing if participant is blocked', async () => {
    // Block user
    await MeetupRepository.addBlock(testCreatorId, testBlockedId, 'Спам');

    // List meetups for testBlockedId
    const listing = await MeetupRepository.getAllMeetups({ currentUserId: testBlockedId });
    expect(listing.some((m) => m.id === localMeetupId)).toBe(false);
  });

  it('should allow only creator to complete the meetup', async () => {
    // Non-creator tries to complete -> throws FORBIDDEN_NOT_CREATOR
    await expect(
      MeetupRepository.completeMeetup(localMeetupId, testUser2Id)
    ).rejects.toThrow('FORBIDDEN_NOT_CREATOR');

    // Creator completes -> succeeds
    const completed = await MeetupRepository.completeMeetup(localMeetupId, testCreatorId);
    expect(completed.status).toBe('completed');
  });
});
