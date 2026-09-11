import { getDbPool } from './index';
import { meetups, meetupParticipants } from './schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { and, lt, eq, inArray, count } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function expireOverdueMeetups() {
  const pool = getDbPool();
  const db = drizzle(pool, { schema });

  const now = new Date();
  logger.info('meetup_expiration_started', { details: { timestamp: now.toISOString() } });

  try {
    // 1. Find gathering meetups where startsAt has passed
    const overdueMeetups = await db
      .select({
        id: meetups.id,
        startsAt: meetups.startsAt,
      })
      .from(meetups)
      .where(
        and(
          inArray(meetups.status, ['draft', 'scheduled', 'gathering']),
          lt(meetups.startsAt, now)
        )
      );

    let cancelledCount = 0;
    for (const m of overdueMeetups) {
      // Check participant count
      const participants = await db
        .select({ count: count() })
        .from(meetupParticipants)
        .where(
          and(
            eq(meetupParticipants.meetupId, m.id),
            eq(meetupParticipants.status, 'joined')
          )
        );

      const participantCount = Number(participants[0]?.count || 0);

      // If under quorum (< 2), cancel by system
      if (participantCount < 2) {
        await db
          .update(meetups)
          .set({
            status: 'cancelled_by_system',
            updatedAt: new Date(),
          })
          .where(eq(meetups.id, m.id));

        cancelledCount++;
      } else {
        // If quorum reached, transition to active
        await db
          .update(meetups)
          .set({
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(meetups.id, m.id));
      }
    }

    logger.info('meetup_expiration_completed', {
      details: {
        overdueProcessed: overdueMeetups.length,
        cancelledCount,
      },
    });

    return { processed: overdueMeetups.length, cancelledCount };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown expiration error';
    logger.error('meetup_expiration_failed', { details: { error: errorMsg } });
    throw err;
  }
}

if (require.main === module) {
  expireOverdueMeetups()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
