import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  uniqueIndex,
  index,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import {
  userRoleEnum,
  userStatusEnum,
  moderationStatusEnum,
  ageBandEnum,
  meetupStatusEnum,
  participantRoleEnum,
  participantStatusEnum,
  reportPriorityEnum,
  reportCategoryEnum,
} from './enums';

// 1. users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneLookupHash: text('phone_lookup_hash').notNull().unique(),
  role: userRoleEnum('role').default('user').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  ageConfirmedAt: timestamp('age_confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 2. sessions
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. profiles
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  ageBand: ageBandEnum('age_band'), // '18-21', '22-25', '26-30', '31+'
  city: text('city').default('DEMO CITY').notNull(),
  avatarRef: text('avatar_ref'), // silhouette / avatar slug
  isDemo: boolean('is_demo').default(false).notNull(),
  showAgeBandAndInterests: boolean('show_age_band_and_interests').default(true).notNull(),
  showReliabilityBadge: boolean('show_reliability_badge').default(true).notNull(),
  reliabilityScore: integer('reliability_score').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. interests
export const interests = pgTable('interests', {
  id: text('id').primaryKey(),
  labelRu: text('label_ru').notNull(),
  icon: text('icon').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

// 4b. user_interests (junction)
export const userInterests = pgTable(
  'user_interests',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    interestId: text('interest_id').notNull().references(() => interests.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.interestId] }),
  })
);

// 5. activity_types
export const activityTypes = pgTable('activity_types', {
  id: text('id').primaryKey(), // 'coffee', 'walk', 'football', 'board_games', 'workout', 'sports_viewing'
  title: text('title').notNull(),
  icon: text('icon').notNull(),
  defaultDurationMinutes: integer('default_duration_minutes').default(60).notNull(),
  defaultCapacity: integer('default_capacity').default(4).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

// 6. service_zones
export const serviceZones = pgTable('service_zones', {
  id: text('id').primaryKey(), // 'DEMO_PUBLIC_ZONE_1..3'
  city: text('city').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  approximateLat: numeric('approximate_lat', { precision: 10, scale: 6 }),
  approximateLng: numeric('approximate_lng', { precision: 10, scale: 6 }),
  publicPlaceRequired: boolean('public_place_required').default(true).notNull(),
  isWhitelisted: boolean('is_whitelisted').default(true).notNull(),
});

// 7. meetups
export const meetups = pgTable(
  'meetups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    activityTypeId: text('activity_type_id').notNull().references(() => activityTypes.id),
    zoneId: text('zone_id').notNull().references(() => serviceZones.id),
    approximateLat: numeric('approximate_lat', { precision: 10, scale: 6 }),
    approximateLng: numeric('approximate_lng', { precision: 10, scale: 6 }),
    publicPlaceName: text('public_place_name').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').default(60).notNull(),
    capacity: integer('capacity').default(4).notNull(),
    status: meetupStatusEnum('status').default('gathering').notNull(),
    safeDescription: text('safe_description'),
    isDemo: boolean('is_demo').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    meetupsStatusZoneIdx: index('meetups_status_zone_idx').on(table.status, table.zoneId, table.startsAt),
    meetupsCapacityRange: check('meetups_capacity_range', sql`${table.capacity} >= 2 AND ${table.capacity} <= 12`),
    meetupsDurationValid: check('meetups_duration_valid', sql`${table.durationMinutes} >= 15 AND ${table.durationMinutes} <= 240`),
  })
);

// 8. meetup_participants
export const meetupParticipants = pgTable(
  'meetup_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    meetupId: uuid('meetup_id').notNull().references(() => meetups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: participantRoleEnum('role').default('participant').notNull(),
    status: participantStatusEnum('status').default('joined').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    leftAt: timestamp('left_at', { withTimezone: true }),
  },
  (table) => ({
    meetupParticipantsUniqueIdx: uniqueIndex('meetup_participants_unique_idx').on(table.meetupId, table.userId),
  })
);

// 9. meetup_events
export const meetupEvents = pgTable('meetup_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetupId: uuid('meetup_id').notNull().references(() => meetups.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => users.id),
  eventType: text('event_type').notNull(),
  redactedPayload: jsonb('redacted_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. meetup_messages
export const meetupMessages = pgTable(
  'meetup_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    meetupId: uuid('meetup_id').notNull().references(() => meetups.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').notNull().references(() => users.id),
    body: text('body').notNull(),
    moderationStatus: moderationStatusEnum('moderation_status').default('approved').notNull(),
    retentionExpiresAt: timestamp('retention_expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    meetupMessagesRetentionIdx: index('meetup_messages_retention_idx').on(table.meetupId, table.retentionExpiresAt),
  })
);

// 11. ratings
export const ratings = pgTable(
  'ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    meetupId: uuid('meetup_id').notNull().references(() => meetups.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').notNull().references(() => users.id),
    targetId: uuid('target_id').notNull().references(() => users.id),
    showedUp: boolean('showed_up').default(true).notNull(),
    onTime: boolean('on_time').default(true).notNull(),
    respectful: boolean('respectful').default(true).notNull(),
    wouldJoinAgain: boolean('would_join_again').default(true).notNull(),
    status: moderationStatusEnum('status').default('approved').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ratingsUniqueIdx: uniqueIndex('ratings_unique_idx').on(table.meetupId, table.authorId, table.targetId),
    ratingsPreventSelf: check('ratings_prevent_self', sql`${table.authorId} <> ${table.targetId}`),
  })
);

// 12. reports
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    meetupId: uuid('meetup_id').references(() => meetups.id),
    reporterId: uuid('reporter_id').notNull().references(() => users.id),
    targetId: uuid('target_id').references(() => users.id),
    category: reportCategoryEnum('category').notNull(),
    description: text('description').notNull(),
    priority: reportPriorityEnum('priority').default('p2_medium').notNull(),
    status: text('status').default('pending').notNull(),
    moderatorId: uuid('moderator_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    reportsPriorityStatusIdx: index('reports_priority_status_idx').on(table.status, table.priority),
  })
);

// 13. blocks
export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    blocksPairIdx: uniqueIndex('blocks_pair_idx').on(table.blockerId, table.blockedId),
    blocksPreventSelf: check('blocks_prevent_self', sql`${table.blockerId} <> ${table.blockedId}`),
  })
);

// 14. safety_events
export const safetyEvents = pgTable('safety_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetupId: uuid('meetup_id').references(() => meetups.id),
  reporterId: uuid('reporter_id').notNull().references(() => users.id),
  eventType: text('event_type').default('safety_help').notNull(),
  approximateLocation: jsonb('approximate_location'),
  status: text('status').default('triggered').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 15. consents
export const consents = pgTable('consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(),
  documentVersion: text('document_version').notNull(),
  textHash: text('text_hash').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).defaultNow().notNull(),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
});

// 16. notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 17. audit_logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  correlationId: text('correlation_id'),
  redactedDiff: jsonb('redacted_diff'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 18. feature_flags
export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  description: text('description'),
  enabled: boolean('enabled').default(false).notNull(),
  rules: jsonb('rules'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 19. share_cards
export const shareCards = pgTable('share_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetupId: uuid('meetup_id').notNull().references(() => meetups.id, { onDelete: 'cascade' }),
  cardData: jsonb('card_data').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
