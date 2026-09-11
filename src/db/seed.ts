import { getDbPool } from './index';
import { serviceZones, users, profiles, activityTypes, meetups, meetupParticipants } from './schema';
import { getEnv } from '@/lib/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import crypto from 'crypto';

import { DEMO_USERS, DEMO_ACTIVITY_TYPES, DEMO_PUBLIC_ZONES } from '@/lib/demo-data';
export { DEMO_USERS, DEMO_ACTIVITY_TYPES, DEMO_PUBLIC_ZONES };


export async function runSeed() {
  const env = getEnv();

  // Safety guard: NEVER run seed in production!
  if (env.NODE_ENV === 'production') {
    throw new Error('FATAL: Seed execution is strictly prohibited when NODE_ENV=production');
  }

  const pool = getDbPool();
  const db = drizzle(pool, { schema });

  // eslint-disable-next-line no-console
  console.log('🌱 Starting NOW / IRL DEMO seed insertion for DEMO CITY...');

  // 1. Insert Whitelisted Activity Types
  for (const act of DEMO_ACTIVITY_TYPES) {
    await db
      .insert(activityTypes)
      .values(act)
      .onConflictDoUpdate({
        target: activityTypes.id,
        set: {
          title: act.title,
          icon: act.icon,
          defaultDurationMinutes: act.defaultDurationMinutes,
          defaultCapacity: act.defaultCapacity,
          isActive: act.isActive,
        },
      });
  }

  // 2. Insert Abstract DEMO Zones
  for (const zone of DEMO_PUBLIC_ZONES) {
    await db
      .insert(serviceZones)
      .values(zone)
      .onConflictDoUpdate({
        target: serviceZones.id,
        set: {
          name: zone.name,
          description: zone.description,
          city: zone.city,
          isWhitelisted: zone.isWhitelisted,
        },
      });
  }

  // 3. Insert Synthetic DEMO Users
  const userMap: Record<string, string> = {};

  for (const u of DEMO_USERS) {
    const phoneLookupHash = crypto
      .createHmac('sha256', env.OTP_HMAC_SECRET)
      .update(u.phone)
      .digest('hex');

    const [user] = await db
      .insert(users)
      .values({
        phoneLookupHash,
        role: 'user',
        status: 'active',
        ageConfirmedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.phoneLookupHash,
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();

    await db
      .insert(profiles)
      .values({
        userId: user.id,
        displayName: u.displayName,
        bio: u.bio,
        ageBand: u.ageBand,
        avatarRef: u.avatarRef,
        isDemo: true,
        showReliabilityBadge: true,
        reliabilityScore: u.reliabilityScore,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          displayName: u.displayName,
          bio: u.bio,
          reliabilityScore: u.reliabilityScore,
          isDemo: true,
        },
      });

    userMap[u.id] = user.id;
  }

  // 4. Insert Demo "Огоньки" (Meetups) across zones
  const now = Date.now();
  const u1 = Object.values(userMap)[0];
  const u2 = Object.values(userMap)[1];
  const u3 = Object.values(userMap)[2];
  const u4 = Object.values(userMap)[3];

  const demoMeetups = [
    {
      creatorId: u1,
      activityTypeId: 'board_games',
      zoneId: 'DEMO_ZONE_CENTER',
      publicPlaceName: 'Центральный сквер у фонтана',
      startsAt: new Date(now + 15 * 60 * 1000),
      durationMinutes: 90,
      capacity: 4,
      status: 'gathering' as const,
      safeDescription: 'Партия в Catan и Каркассон. Ищем еще 1 игрока!',
      isDemo: true,
      participantIds: [u1, u2, u3],
    },
    {
      creatorId: u2,
      activityTypeId: 'coffee',
      zoneId: 'DEMO_ZONE_NORTH',
      publicPlaceName: 'Открытая веранда кофейни',
      startsAt: new Date(now + 25 * 60 * 1000),
      durationMinutes: 45,
      capacity: 4,
      status: 'gathering' as const,
      safeDescription: 'Кофе на 40 минут. Обсуждаем IT и пет-проекты.',
      isDemo: true,
      participantIds: [u2, u1],
    },
    {
      creatorId: u3,
      activityTypeId: 'football',
      zoneId: 'DEMO_ZONE_SPORT',
      publicPlaceName: 'Открытое поле с искусственным газоном',
      startsAt: new Date(now + 35 * 60 * 1000),
      durationMinutes: 90,
      capacity: 10,
      status: 'gathering' as const,
      safeDescription: 'Играем 5х5. Нужны еще 5 человек для двух полных составов!',
      isDemo: true,
      participantIds: [u3, u4, u1, u2, u3],
    },
    {
      creatorId: u4,
      activityTypeId: 'walking',
      zoneId: 'DEMO_ZONE_PARK',
      publicPlaceName: 'Центральная аллея парка',
      startsAt: new Date(now + 20 * 60 * 1000),
      durationMinutes: 60,
      capacity: 5,
      status: 'gathering' as const,
      safeDescription: 'Пешая прогулка по парку 5 км в комфортном темпе.',
      isDemo: true,
      participantIds: [u4, u1, u2],
    },
    {
      creatorId: u1,
      activityTypeId: 'workout',
      zoneId: 'DEMO_ZONE_RIVER',
      publicPlaceName: 'Воркаут-площадка на набережной',
      startsAt: new Date(now + 40 * 60 * 1000),
      durationMinutes: 45,
      capacity: 5,
      status: 'gathering' as const,
      safeDescription: 'Легкий кросс и турники на свежем воздухе у воды.',
      isDemo: true,
      participantIds: [u1, u4, u3, u2],
    },
    {
      creatorId: u2,
      activityTypeId: 'study',
      zoneId: 'DEMO_ZONE_CENTER',
      publicPlaceName: 'Открытый коворкинг / библиотека',
      startsAt: new Date(now + 50 * 60 * 1000),
      durationMinutes: 60,
      capacity: 4,
      status: 'gathering' as const,
      safeDescription: 'Совместный кодинг и подготовка к собеседованиям.',
      isDemo: true,
      participantIds: [u2, u3],
    },
    {
      creatorId: u3,
      activityTypeId: 'sports_viewing',
      zoneId: 'DEMO_ZONE_SPORT',
      publicPlaceName: 'Спорт-бар с открытой верандой',
      startsAt: new Date(now + 75 * 60 * 1000),
      durationMinutes: 120,
      capacity: 6,
      status: 'gathering' as const,
      safeDescription: 'Смотрим турнир UFC. Чай и безалкогольные напитки.',
      isDemo: true,
      participantIds: [u3, u1, u2, u4],
    },
  ];

  for (const m of demoMeetups) {
    const [meetup] = await db
      .insert(meetups)
      .values({
        creatorId: m.creatorId,
        activityTypeId: m.activityTypeId,
        zoneId: m.zoneId,
        publicPlaceName: m.publicPlaceName,
        startsAt: m.startsAt,
        durationMinutes: m.durationMinutes,
        capacity: m.capacity,
        status: m.status,
        safeDescription: m.safeDescription,
        isDemo: m.isDemo,
      })
      .returning();

    for (const pId of m.participantIds) {
      await db
        .insert(meetupParticipants)
        .values({
          meetupId: meetup.id,
          userId: pId,
          role: pId === m.creatorId ? 'creator' : 'participant',
          status: 'joined',
        })
        .onConflictDoNothing();
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ NOW / IRL DEMO seed completed! (Zones: ${DEMO_PUBLIC_ZONES.length}, Users: ${DEMO_USERS.length}, Flames: ${demoMeetups.length})`);
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('❌ DEMO seed execution failed:', err);
      process.exit(1);
    });
}
