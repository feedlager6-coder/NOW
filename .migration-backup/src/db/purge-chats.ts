import { getDbPool } from './index';
import { meetupMessages, meetups, reports } from './schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { and, lt, inArray, notInArray, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function purgeExpiredChats() {
  const pool = getDbPool();
  const db = drizzle(pool, { schema });

  const now = new Date();
  logger.info('chat_retention_purge_started', { details: { timestamp: now.toISOString() } });

  try {
    // 1. Find meetups that have active safety reports (exception to purge policy)
    const activeReportedMeetups = await db
      .select({ meetupId: reports.meetupId })
      .from(reports)
      .where(inArray(reports.status, ['pending', 'investigating']));

    const exemptMeetupIds = activeReportedMeetups
      .map((r) => r.meetupId)
      .filter((id): id is string => Boolean(id));

    // 2. Query expired messages where retentionExpiresAt < now and not exempt
    let deletedCount = 0;
    if (exemptMeetupIds.length > 0) {
      const deleted = await db
        .delete(meetupMessages)
        .where(
          and(
            lt(meetupMessages.retentionExpiresAt, now),
            notInArray(meetupMessages.meetupId, exemptMeetupIds)
          )
        )
        .returning({ id: meetupMessages.id });
      deletedCount = deleted.length;
    } else {
      const deleted = await db
        .delete(meetupMessages)
        .where(lt(meetupMessages.retentionExpiresAt, now))
        .returning({ id: meetupMessages.id });
      deletedCount = deleted.length;
    }

    logger.info('chat_retention_purge_completed', {
      details: {
        deletedMessagesCount: deletedCount,
        exemptMeetupsCount: exemptMeetupIds.length,
      },
    });

    return { deletedCount, exemptCount: exemptMeetupIds.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown purge error';
    logger.error('chat_retention_purge_failed', { details: { error: errorMsg } });
    throw err;
  }
}

if (require.main === module) {
  purgeExpiredChats()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
