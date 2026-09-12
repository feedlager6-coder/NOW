import { getDbPool } from './index';
import { serviceZones, users, profiles } from './schema';
import { getEnv } from '@/lib/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import crypto from 'crypto';

export async function runSeed() {
  const env = getEnv();

  // Safety guard: NEVER run seed in production!
  if (env.NODE_ENV === 'production') {
    throw new Error('FATAL: Seed execution is strictly prohibited when NODE_ENV=production');
  }

  const pool = getDbPool();
  const db = drizzle(pool, { schema });

  // eslint-disable-next-line no-console
  console.log('🌱 Starting DEMO seed insertion...');

  // 1. Insert Whitelisted DEMO Public Zones (Fictional coordinates and places only)
  const demoZones = [
    {
      id: 'DEMO_PUBLIC_ZONE_1',
      city: 'Махачкала',
      name: 'Вымышленная демонстрационная набережная (Зона 1)',
      description: 'Открытая благоустроенная пешеходная набережная для демонстрации безопасных встреч',
      approximateLat: '42.000100',
      approximateLng: '47.000100',
      publicPlaceRequired: true,
      isWhitelisted: true,
    },
    {
      id: 'DEMO_PUBLIC_ZONE_2',
      city: 'Махачкала',
      name: 'Вымышленный общественный сквер (Зона 2)',
      description: 'Открытая аллея возле центрального фонтана демонстрационного сквера',
      approximateLat: '42.010200',
      approximateLng: '47.010200',
      publicPlaceRequired: true,
      isWhitelisted: true,
    },
    {
      id: 'DEMO_PUBLIC_ZONE_3',
      city: 'Махачкала',
      name: 'Вымышленный открытый коворкинг / фудкорт (Зона 3)',
      description: 'Открытая общественная зона фудкорта в демонстрационном торговом пространстве',
      approximateLat: '42.020300',
      approximateLng: '47.020300',
      publicPlaceRequired: true,
      isWhitelisted: true,
    },
  ];

  for (const zone of demoZones) {
    await db
      .insert(serviceZones)
      .values(zone)
      .onConflictDoUpdate({
        target: serviceZones.id,
        set: {
          name: zone.name,
          description: zone.description,
          isWhitelisted: zone.isWhitelisted,
        },
      });
  }

  // 2. Insert Synthetic DEMO Performers (Completely fictional profiles)
  const demoPerformers = [
    {
      displayName: 'Демо-Рина [DEMO]',
      bio: 'Люблю инди-рок, винил и долгие разговоры о книгах за зеленым чаем.',
      ageBand: '22-25',
      styles: ['alt', 'indie'],
      interests: ['music', 'coffee', 'books'],
      hourlyRate: 150000, // 1500.00 RUB
      avatarRef: '/avatars/demo-avatar-1.svg',
    },
    {
      displayName: 'Демо-Марк [DEMO]',
      bio: 'Увлекаюсь ретро-играми, настолками и кибербезопасностью. Рад сыграть партию в шахматы.',
      ageBand: '26-30',
      styles: ['gamer', 'geek'],
      interests: ['boardgames', 'gaming', 'tech'],
      hourlyRate: 180000, // 1800.00 RUB
      avatarRef: '/avatars/demo-avatar-2.svg',
    },
    {
      displayName: 'Демо-Юлиана [DEMO]',
      bio: 'Художница, интересуюсь готической архитектурой, стрит-артом и фото-прогулками.',
      ageBand: '18-21',
      styles: ['goth', 'alt'],
      interests: ['art', 'photography', 'urban'],
      hourlyRate: 160000, // 1600.00 RUB
      avatarRef: '/avatars/demo-avatar-3.svg',
    },
  ];

  for (let i = 0; i < demoPerformers.length; i++) {
    const item = demoPerformers[i];
    const syntheticPhone = `+7000000000${i + 1}`;
    const phoneLookupHash = crypto
      .createHmac('sha256', env.OTP_HMAC_SECRET)
      .update(syntheticPhone)
      .digest('hex');

    const [user] = await db
      .insert(users)
      .values({
        phoneLookupHash,
        role: 'performer',
        status: 'active',
        ageConfirmedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.phoneLookupHash,
        set: { status: 'active' },
      })
      .returning();

    await db
      .insert(profiles)
      .values({
        userId: user.id,
        displayName: item.displayName,
        bio: item.bio,
        ageBand: item.ageBand,
        avatarRef: item.avatarRef,
        styles: item.styles,
        interests: item.interests,
        hourlyRate: item.hourlyRate,
        isDemo: true, // EXPLICIT DEMO FLAG
        moderationStatus: 'approved',
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          displayName: item.displayName,
          bio: item.bio,
          isDemo: true,
          moderationStatus: 'approved',
        },
      });
  }

  // eslint-disable-next-line no-console
  console.log('✅ DEMO seed successfully inserted (Zones & Synthetic Performers).');
}

// Execute if run directly via CLI
if (require.main === module || process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
