import { describe, it, expect, beforeEach } from 'vitest';
import { demoStore } from '@/lib/demo-store';
import { DEMO_USERS } from '@/lib/demo-data';

describe('GET /api/meetups & DemoStore Unit Tests', () => {
  beforeEach(() => {
    demoStore.reset();
  });

  it('should return 7 initial demo meetups with anonymous discovery serialization', () => {
    const meetups = demoStore.getAll();
    expect(meetups.length).toBe(7);

    // Verify anonymous discovery constraints
    for (const m of meetups) {
      expect(m.id).toBeDefined();
      expect(m.activityTitle).toBeDefined();
      expect(m.activityIcon).toBeDefined();
      expect(m.zoneName).toBeDefined();
      expect(m.distanceBand).toBeDefined();
      expect(m.capacity).toBeGreaterThanOrEqual(2);
      expect(m.occupiedSlots).toBeGreaterThanOrEqual(1);
      expect(m.participantSilhouettes.length).toBe(m.occupiedSlots);

      // Verify zero-PII and zero raw GPS
      expect(m).not.toHaveProperty('approximateLat');
      expect(m).not.toHaveProperty('approximateLng');
      expect(m).not.toHaveProperty('phone');
      expect(m).not.toHaveProperty('realName');
      expect(m).not.toHaveProperty('exactLocation');
    }
  });

  it('should filter meetups by category', () => {
    const coffeeMeetups = demoStore.getAll({ category: 'coffee' });
    expect(coffeeMeetups.length).toBeGreaterThan(0);
    expect(coffeeMeetups.every((m) => m.activityTypeId === 'coffee')).toBe(true);

    const walkingMeetups = demoStore.getAll({ category: 'walking' });
    expect(walkingMeetups.length).toBeGreaterThan(0);
    expect(walkingMeetups.every((m) => m.activityTypeId === 'walking')).toBe(true);
  });

  it('should filter meetups by zoneId', () => {
    const centerMeetups = demoStore.getAll({ zoneId: 'DEMO_ZONE_CENTER' });
    expect(centerMeetups.length).toBeGreaterThan(0);
    expect(centerMeetups.every((m) => m.zoneId === 'DEMO_ZONE_CENTER')).toBe(true);
  });

  it('should isolate meetups involving blocked users', () => {
    const userA = DEMO_USERS[0].id;
    const userB = DEMO_USERS[1].id;

    // Initially userA sees meetups
    const initialForA = demoStore.getAll({ currentUserId: userA });

    // Now User A blocks User B
    demoStore.addBlock(userA, userB);

    const afterBlockForA = demoStore.getAll({ currentUserId: userA });
    // Any meetup where User B is creator or participant should now be filtered out
    expect(afterBlockForA.length).toBeLessThan(initialForA.length);
  });

  it('should create a valid demo meetup with correct capacity and defaults', () => {
    const created = demoStore.create({
      creatorId: DEMO_USERS[0].id,
      activityTypeId: 'workout',
      zoneId: 'DEMO_ZONE_SPORT',
      publicPlaceName: 'Турники возле стадиона',
      startsInMinutes: 20,
      capacity: 4,
      safeDescription: 'Разминка и растяжка',
    });

    expect(created.id).toBeDefined();
    expect(created.capacity).toBe(4);
    expect(created.participantIds).toContain(DEMO_USERS[0].id);

    const serialized = demoStore.serializeMeetup(created);
    expect(serialized.activityTitle).toBe('Воркаут');
    expect(serialized.occupiedSlots).toBe(1);
    expect(serialized.capacity).toBe(4);
  });

  it('should enforce capacity limits and atomic join rules', () => {
    const meetup = demoStore.create({
      creatorId: DEMO_USERS[0].id,
      activityTypeId: 'coffee',
      zoneId: 'DEMO_ZONE_CENTER',
      publicPlaceName: 'Кофейня у сквера',
      startsInMinutes: 30,
      capacity: 2,
    });

    // 1st slot is creator (DEMO_USERS[0])
    // 2nd slot: join DEMO_USERS[1] -> success
    const join1 = demoStore.join(meetup.id, DEMO_USERS[1].id);
    expect(join1.success).toBe(true);

    // Duplicate join by DEMO_USERS[1] -> ALREADY_JOINED
    const dupJoin = demoStore.join(meetup.id, DEMO_USERS[1].id);
    expect(dupJoin.success).toBe(false);
    expect(dupJoin.error).toBe('ALREADY_JOINED');

    // 3rd slot: join DEMO_USERS[2] -> CAPACITY_REACHED
    const join2 = demoStore.join(meetup.id, DEMO_USERS[2].id);
    expect(join2.success).toBe(false);
    expect(join2.error).toBe('CAPACITY_REACHED');
  });

  it('should handle check-in and leave properly', () => {
    const meetup = demoStore.create({
      creatorId: DEMO_USERS[0].id,
      activityTypeId: 'walking',
      zoneId: 'DEMO_ZONE_PARK',
      publicPlaceName: 'Центральная аллея',
      startsInMinutes: 15,
      capacity: 4,
    });

    demoStore.join(meetup.id, DEMO_USERS[1].id);

    // Non-participant cannot check in
    const checkFail = demoStore.checkIn(meetup.id, DEMO_USERS[2].id);
    expect(checkFail.success).toBe(false);
    expect(checkFail.error).toBe('NOT_A_PARTICIPANT');

    // Participant checks in
    const checkOk = demoStore.checkIn(meetup.id, DEMO_USERS[1].id);
    expect(checkOk.success).toBe(true);
    expect(checkOk.meetup?.checkedInUserIds).toContain(DEMO_USERS[1].id);

    // User leaves
    const leaveRes = demoStore.leave(meetup.id, DEMO_USERS[1].id);
    expect(leaveRes.success).toBe(true);
    expect(leaveRes.meetup?.participantIds).not.toContain(DEMO_USERS[1].id);
    expect(leaveRes.meetup?.checkedInUserIds).not.toContain(DEMO_USERS[1].id);
  });

  it('should isolate chat to participants and sanitize inputs', () => {
    const meetup = demoStore.create({
      creatorId: DEMO_USERS[0].id,
      activityTypeId: 'board_games',
      zoneId: 'DEMO_ZONE_CENTER',
      publicPlaceName: 'Антикафе у площади',
      startsInMinutes: 30,
      capacity: 4,
    });

    // Non-participant cannot read chat
    const getFail = demoStore.getMessages(meetup.id, DEMO_USERS[3].id);
    expect(getFail.success).toBe(false);
    expect(getFail.error).toBe('FORBIDDEN_NOT_PARTICIPANT');

    // Non-participant cannot post message
    const postFail = demoStore.addMessage(meetup.id, DEMO_USERS[3].id, 'Привет!');
    expect(postFail.success).toBe(false);
    expect(postFail.error).toBe('FORBIDDEN_NOT_PARTICIPANT');

    // Creator posts message
    const postOk = demoStore.addMessage(meetup.id, DEMO_USERS[0].id, '<b>Привет</b> всем!');
    expect(postOk.success).toBe(true);
    expect(postOk.message?.body).toBe('Привет всем!'); // HTML stripped

    // Forbidden solicitation check
    const postForbidden = demoStore.addMessage(meetup.id, DEMO_USERS[0].id, 'Переведи мне оплата за участие');
    expect(postForbidden.success).toBe(false);
    expect(postForbidden.error).toBe('FORBIDDEN_CONTENT');
  });

  it('should enforce zero-PII share-card generation', () => {
    const meetup = demoStore.create({
      creatorId: DEMO_USERS[0].id,
      activityTypeId: 'football',
      zoneId: 'DEMO_ZONE_SPORT',
      publicPlaceName: 'Спортивная коробка',
      startsInMinutes: 10,
      capacity: 6,
    });

    demoStore.join(meetup.id, DEMO_USERS[1].id);
    demoStore.complete(meetup.id);

    const cardRes = demoStore.getShareCardData(meetup.id);
    expect(cardRes.success).toBe(true);
    const card = cardRes.card!;

    expect(card.activityTitle).toBe('Футбол');
    expect(card.participantCount).toBe(2);
    expect(card.status).toBe('completed');
    expect(card.logo).toBe('NOW / IRL');

    // Verify zero PII in share card
    expect(card).not.toHaveProperty('phone');
    expect(card).not.toHaveProperty('users');
    expect(card).not.toHaveProperty('creatorName');
    expect(card).not.toHaveProperty('participantNames');
    expect(card).not.toHaveProperty('messages');
    expect(card).not.toHaveProperty('lat');
    expect(card).not.toHaveProperty('lng');
  });

  it('should properly register reports and safety events', () => {
    const report = demoStore.addReport({
      meetupId: 'meetup-test',
      reporterId: DEMO_USERS[0].id,
      targetId: DEMO_USERS[1].id,
      category: 'commercial_solicitation',
      description: 'Требовал деньги за встречу',
    });

    expect(report.id).toBeDefined();
    expect(report.category).toBe('commercial_solicitation');
    expect(report.description).toBe('Требовал деньги за встречу');

    const safetyEvent = demoStore.addSafetyEvent({
      meetupId: 'meetup-test',
      reporterId: DEMO_USERS[0].id,
      eventType: 'emergency_call_initiated',
    });

    expect(safetyEvent.id).toBeDefined();
    expect(safetyEvent.eventType).toBe('emergency_call_initiated');
  });

  it('should allow creating a second meetup immediately after completing the first one without collision or lingering state', () => {
    // 1. Create first meetup
    const first = demoStore.create({
      creatorId: DEMO_USERS[0].id,
      activityTypeId: 'coffee',
      zoneId: 'DEMO_ZONE_CENTER',
      publicPlaceName: 'Кофейня у площади',
      startsInMinutes: 20,
      capacity: 4,
    });
    expect(first.id).toBeDefined();

    // 2. Complete first meetup
    const completeRes = demoStore.complete(first.id, DEMO_USERS[0].id);
    expect(completeRes.success).toBe(true);
    expect(completeRes.meetup?.status).toBe('completed');

    // 3. Immediately create second meetup by same creator
    const second = demoStore.create({
      creatorId: DEMO_USERS[0].id,
      activityTypeId: 'walking',
      zoneId: 'DEMO_ZONE_PARK',
      publicPlaceName: 'Центральная аллея парка',
      startsInMinutes: 15,
      capacity: 3,
    });
    expect(second.id).toBeDefined();
    expect(second.id).not.toBe(first.id);
    expect(second.status).toBe('gathering');

    // 4. Verify getAll returns second meetup and DOES NOT return completed first meetup
    const activeMeetups = demoStore.getAll();
    expect(activeMeetups.some((m) => m.id === second.id)).toBe(true);
    expect(activeMeetups.some((m) => m.id === first.id)).toBe(false);
  });
});

