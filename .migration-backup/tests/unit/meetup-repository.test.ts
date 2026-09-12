import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import fs from 'fs';
import path from 'path';
import { MeetupRepository } from '@/repositories/meetup-repository';
import { UserRepository } from '@/repositories/user-repository';

describe('MeetupRepository Unit Tests (using in-memory PGlite)', () => {
  let db: any;
  let pglite: PGlite;
  let creatorId: string;
  let participantId: string;
  let blockedUserId: string;

  beforeAll(async () => {
    pglite = new PGlite();
    db = drizzle(pglite, { schema });

    const migrationsDir = path.resolve(__dirname, '../../src/db/migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
      .sort();

    for (const file of files) {
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await pglite.exec(statement);
      }
    }

    // Seed activity types and service zones
    await db.insert(schema.activityTypes).values([
      { id: 'walk', title: 'Прогулка', icon: '🚶' },
      { id: 'coffee', title: 'Кофе', icon: '☕' },
      { id: 'board_games', title: 'Настольные игры', icon: '🎲' },
    ]);

    await db.insert(schema.serviceZones).values([
      { id: 'DEMO_ZONE_CENTER', city: 'DEMO CITY', name: 'Центральный сквер' },
      { id: 'DEMO_ZONE_NORTH', city: 'DEMO CITY', name: 'Северный бульвар' },
    ]);

    // Create users
    const u1 = await UserRepository.createUser({ phoneLookupHash: 'hash_creator' }, db);
    const u2 = await UserRepository.createUser({ phoneLookupHash: 'hash_participant' }, db);
    const u3 = await UserRepository.createUser({ phoneLookupHash: 'hash_blocked' }, db);

    creatorId = u1.id;
    participantId = u2.id;
    blockedUserId = u3.id;

    await UserRepository.saveProfile({ userId: creatorId, displayName: 'Организатор' }, db);
    await UserRepository.saveProfile({ userId: participantId, displayName: 'Участник 1' }, db);
    await UserRepository.saveProfile({ userId: blockedUserId, displayName: 'Нежелательный' }, db);
  });

  it('should create meetup, verify creator role in participants, and fetch discovery cards', async () => {
    const created = await MeetupRepository.createMeetup(
      {
        creatorId,
        activityTypeId: 'coffee',
        zoneId: 'DEMO_ZONE_CENTER',
        publicPlaceName: 'Кофейня у фонтана',
        startsInMinutes: 20,
        capacity: 4,
        safeDescription: 'Кофе и беседы',
      },
      db
    );

    expect(created.id).toBeDefined();
    expect(created.status).toBe('gathering');

    const cards = await MeetupRepository.getAllMeetups(undefined, db);
    expect(cards.length).toBeGreaterThan(0);
    const card = cards.find((c) => c.id === created.id);
    expect(card).toBeDefined();
    expect(card?.activityTitle).toBe('Кофе');
    expect(card?.occupiedSlots).toBe(1);
    expect(card?.participantSilhouettes.length).toBe(1);
  });

  it('should allow user to join meetup and check in', async () => {
    const created = await MeetupRepository.createMeetup(
      {
        creatorId,
        activityTypeId: 'walk',
        zoneId: 'DEMO_ZONE_NORTH',
        publicPlaceName: 'Парковая аллея',
        capacity: 3,
      },
      db
    );

    const joinRes = await MeetupRepository.joinMeetup(created.id, participantId, db);
    expect(joinRes.success).toBe(true);
    expect(joinRes.alreadyJoined).toBe(false);

    // Creator checks in
    await MeetupRepository.checkInParticipant(created.id, creatorId, db);

    // Participant checks in (now 2 checked in -> status should transition to 'active')
    await MeetupRepository.checkInParticipant(created.id, participantId, db);

    const details = await MeetupRepository.getMeetupById(created.id, participantId, db);
    expect(details?.meetup.status).toBe('active');
  });

  it('should send and retrieve chat messages with 12h retention for participants', async () => {
    const created = await MeetupRepository.createMeetup(
      {
        creatorId,
        activityTypeId: 'board_games',
        zoneId: 'DEMO_ZONE_CENTER',
        publicPlaceName: 'Столики в сквере',
      },
      db
    );

    await MeetupRepository.joinMeetup(created.id, participantId, db);

    const msg = await MeetupRepository.addMessage(
      created.id,
      participantId,
      'Привет, я уже подхожу!',
      12,
      db
    );
    expect(msg.id).toBeDefined();
    expect(msg.body).toBe('Привет, я уже подхожу!');

    const details = await MeetupRepository.getMeetupById(created.id, participantId, db);
    expect(details?.messages.length).toBe(1);
    expect(details?.messages[0].body).toBe('Привет, я уже подхожу!');
  });

  it('should filter out meetups if user has blocked creator', async () => {
    const created = await MeetupRepository.createMeetup(
      {
        creatorId: blockedUserId,
        activityTypeId: 'walk',
        zoneId: 'DEMO_ZONE_CENTER',
        publicPlaceName: 'Аллея',
      },
      db
    );

    // Participant blocks the creator
    await MeetupRepository.addBlock(participantId, blockedUserId, 'spam', db);

    // Participant should NOT see this meetup
    const visibleCards = await MeetupRepository.getAllMeetups(
      { currentUserId: participantId },
      db
    );
    expect(visibleCards.some((c) => c.id === created.id)).toBe(false);
  });
});
