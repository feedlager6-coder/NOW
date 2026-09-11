import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  jsonb,
  uuid,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  userRoleEnum,
  userStatusEnum,
  moderationStatusEnum,
  bookingStatusEnum,
  paymentStatusEnum,
  reportPriorityEnum,
  reportCategoryEnum,
} from './enums';

// ----------------------------------------------------
// 1. USERS
// ----------------------------------------------------
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phoneLookupHash: text('phone_lookup_hash').notNull().unique(), // HMAC-SHA256(phone, server_secret)
    role: userRoleEnum('role').default('client').notNull(),
    status: userStatusEnum('status').default('active').notNull(),
    ageConfirmedAt: timestamp('age_confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    phoneLookupHashIdx: uniqueIndex('users_phone_lookup_hash_idx').on(table.phoneLookupHash),
    statusIdx: index('users_status_idx').on(table.status),
    roleIdx: index('users_role_idx').on(table.role),
  })
);

// ----------------------------------------------------
// 2. SESSIONS
// ----------------------------------------------------
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('sessions_user_idx').on(table.userId),
    tokenHashIdx: uniqueIndex('sessions_token_hash_idx').on(table.tokenHash),
  })
);

// ----------------------------------------------------
// 3. PROFILES
// ----------------------------------------------------
export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .primaryKey(),
    displayName: text('display_name').notNull(),
    bio: text('bio'),
    ageBand: text('age_band').notNull(), // '18-21', '22-25', '26-30', '31+'
    avatarRef: text('avatar_ref'),
    styles: jsonb('styles').$type<string[]>().default([]).notNull(),
    interests: jsonb('interests').$type<string[]>().default([]).notNull(),
    languages: jsonb('languages').$type<string[]>().default(['ru']).notNull(),
    hourlyRate: integer('hourly_rate').default(150000).notNull(), // in kopecks (e.g. 1500.00 RUB)
    minDuration: integer('min_duration').default(60).notNull(), // minutes
    city: text('city').default('Махачкала').notNull(),
    isDemo: boolean('is_demo').default(false).notNull(), // Prevents demo profiles from looking real
    moderationStatus: moderationStatusEnum('moderation_status').default('pending').notNull(),
  },
  (table) => ({
    cityIdx: index('profiles_city_idx').on(table.city),
    statusIdx: index('profiles_moderation_status_idx').on(table.moderationStatus),
    isDemoIdx: index('profiles_is_demo_idx').on(table.isDemo),
    hourlyRateCheck: check('profiles_hourly_rate_positive', sql`hourly_rate > 0`),
    minDurationCheck: check('profiles_min_duration_positive', sql`min_duration >= 30`),
  })
);

// ----------------------------------------------------
// 4. PERFORMER APPLICATIONS
// ----------------------------------------------------
export const performerApplications = pgTable(
  'performer_applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    answers: jsonb('answers').notNull(),
    status: moderationStatusEnum('status').default('pending').notNull(),
    moderatorId: uuid('moderator_id').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('applications_user_idx').on(table.userId),
    statusIdx: index('applications_status_idx').on(table.status),
  })
);

// ----------------------------------------------------
// 5. VERIFICATIONS (Mockable KYC / Status & Reference only)
// ----------------------------------------------------
export const verifications = pgTable(
  'verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    provider: text('provider').default('mock_safe_kyc').notNull(),
    status: text('status').notNull(), // 'verified', 'rejected', 'pending'
    providerReference: text('provider_reference').notNull(),
    checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
    consentVersion: text('consent_version').notNull(),
  },
  (table) => ({
    userIdx: index('verifications_user_idx').on(table.userId),
  })
);

// ----------------------------------------------------
// 6. AVAILABILITY
// ----------------------------------------------------
export const availability = pgTable(
  'availability',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    performerId: uuid('performer_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: text('status').default('available').notNull(), // 'available', 'booked', 'blocked'
  },
  (table) => ({
    performerSlotIdx: index('availability_slot_idx').on(table.performerId, table.startsAt, table.endsAt),
    durationCheck: check('availability_duration_valid', sql`ends_at > starts_at`),
  })
);

// ----------------------------------------------------
// 7. SERVICE ZONES (Administrative Whitelist)
// ----------------------------------------------------
export const serviceZones = pgTable(
  'service_zones',
  {
    id: text('id').primaryKey(), // e.g. 'DEMO_PUBLIC_ZONE_1'
    city: text('city').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    approximateLat: numeric('approximate_lat', { precision: 10, scale: 6 }).notNull(),
    approximateLng: numeric('approximate_lng', { precision: 10, scale: 6 }).notNull(),
    publicPlaceRequired: boolean('public_place_required').default(true).notNull(),
    isWhitelisted: boolean('is_whitelisted').default(true).notNull(),
  },
  (table) => ({
    cityIdx: index('service_zones_city_idx').on(table.city),
    whitelistIdx: index('service_zones_whitelist_idx').on(table.isWhitelisted),
  })
);

// ----------------------------------------------------
// 8. BOOKINGS
// ----------------------------------------------------
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    performerId: uuid('performer_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    zoneId: text('zone_id')
      .references(() => serviceZones.id)
      .notNull(),
    approximateLat: numeric('approximate_lat', { precision: 10, scale: 6 }), // Nullable in MVP
    approximateLng: numeric('approximate_lng', { precision: 10, scale: 6 }), // Nullable in MVP
    publicPlaceName: text('public_place_name').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    purpose: text('purpose').notNull(),
    price: integer('price').notNull(), // client total kopecks
    platformFee: integer('platform_fee').notNull(), // platform fee kopecks
    performerAmount: integer('performer_amount').notNull(), // performer payout kopecks
    status: bookingStatusEnum('status').default('draft').notNull(),
    cancellationReason: text('cancellation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('bookings_status_idx').on(table.status),
    clientIdx: index('bookings_client_idx').on(table.clientId, table.status),
    performerActiveIdx: index('bookings_performer_active_idx').on(
      table.performerId,
      table.status,
      table.startsAt,
      table.endsAt
    ),
    bookingDurationCheck: check('bookings_duration_valid', sql`ends_at > starts_at`),
    bookingAmountsCheck: check(
      'bookings_amounts_non_negative',
      sql`price >= 0 AND platform_fee >= 0 AND performer_amount >= 0`
    ),
  })
);

// ----------------------------------------------------
// 9. BOOKING EVENTS (Immutable Audit)
// ----------------------------------------------------
export const bookingEvents = pgTable(
  'booking_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull(),
    actorId: uuid('actor_id')
      .references(() => users.id)
      .notNull(),
    eventType: text('event_type').notNull(), // 'status_change', 'arrived', 'sos_triggered'
    redactedPayload: jsonb('redacted_payload').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index('booking_events_booking_idx').on(table.bookingId),
    actorIdx: index('booking_events_actor_idx').on(table.actorId),
  })
);

// ----------------------------------------------------
// 10. MESSAGES (Isolated In-Booking Chat)
// ----------------------------------------------------
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: uuid('sender_id')
      .references(() => users.id)
      .notNull(),
    body: text('body').notNull(),
    moderationStatus: moderationStatusEnum('moderation_status').default('approved').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    bookingCreatedAtIdx: index('messages_booking_created_idx').on(table.bookingId, table.createdAt),
  })
);

// ----------------------------------------------------
// 11. REVIEWS
// ----------------------------------------------------
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: uuid('author_id')
      .references(() => users.id)
      .notNull(),
    targetId: uuid('target_id')
      .references(() => users.id)
      .notNull(),
    rating: integer('rating').notNull(), // 1 to 5
    text: text('text'),
    status: moderationStatusEnum('status').default('pending').notNull(), // hidden until moderated in MVP
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    bookingAuthorIdx: uniqueIndex('reviews_booking_author_idx').on(table.bookingId, table.authorId),
    targetIdx: index('reviews_target_idx').on(table.targetId),
    ratingCheck: check('reviews_rating_range', sql`rating >= 1 AND rating <= 5`),
    preventSelfReview: check('reviews_prevent_self_review', sql`author_id <> target_id`),
  })
);

// ----------------------------------------------------
// 12. REPORTS
// ----------------------------------------------------
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id').references(() => bookings.id),
    reporterId: uuid('reporter_id')
      .references(() => users.id)
      .notNull(),
    targetId: uuid('target_id')
      .references(() => users.id)
      .notNull(),
    category: reportCategoryEnum('category').notNull(),
    description: text('description').notNull(),
    priority: reportPriorityEnum('priority').default('p2_medium').notNull(),
    status: text('status').default('pending').notNull(), // 'pending', 'investigating', 'resolved', 'dismissed'
    moderatorId: uuid('moderator_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    statusPriorityIdx: index('reports_status_priority_idx').on(table.status, table.priority),
    reporterIdx: index('reports_reporter_idx').on(table.reporterId),
    targetIdx: index('reports_target_idx').on(table.targetId),
  })
);

// ----------------------------------------------------
// 13. BLOCKS
// ----------------------------------------------------
export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    blockerId: uuid('blocker_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    blockedId: uuid('blocked_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    blockerBlockedIdx: uniqueIndex('blocks_pair_idx').on(table.blockerId, table.blockedId),
  })
);

// ----------------------------------------------------
// 14. TRUSTED CONTACTS (Schema only in Slice 1)
// ----------------------------------------------------
export const trustedContacts = pgTable(
  'trusted_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    contactLabel: text('contact_label').notNull(),
    contactValueEncrypted: text('contact_value_encrypted').notNull(), // payload: ciphertext.iv.auth_tag
    keyVersion: integer('key_version').default(1).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (table) => ({
    userIdx: index('trusted_contacts_user_idx').on(table.userId),
  })
);

// ----------------------------------------------------
// 15. SAFETY EVENTS (SOS alerts)
// ----------------------------------------------------
export const safetyEvents = pgTable(
  'safety_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull(),
    reporterId: uuid('reporter_id')
      .references(() => users.id)
      .notNull(),
    eventType: text('event_type').default('sos').notNull(),
    approximateLocation: jsonb('approximate_location').notNull(),
    status: text('status').default('triggered').notNull(), // 'triggered', 'acknowledged', 'resolved'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index('safety_events_booking_idx').on(table.bookingId),
  })
);

// ----------------------------------------------------
// 16. CONSENTS
// ----------------------------------------------------
export const consents = pgTable(
  'consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    consentType: text('consent_type').notNull(), // 'terms_of_service', 'privacy_policy', 'age_18_confirmation', 'public_places_only'
    documentVersion: text('document_version').notNull(),
    textHash: text('text_hash').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).defaultNow().notNull(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  },
  (table) => ({
    userConsentIdx: index('consents_user_type_idx').on(table.userId, table.consentType),
  })
);

// ----------------------------------------------------
// 17. PAYMENTS
// ----------------------------------------------------
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull(),
    provider: text('provider').default('mock_payment').notNull(),
    providerPaymentId: text('provider_payment_id').notNull().unique(),
    amount: integer('amount').notNull(), // in kopecks
    currency: text('currency').default('RUB').notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    refundedAmount: integer('refunded_amount').default(0).notNull(),
  },
  (table) => ({
    bookingIdx: index('payments_booking_idx').on(table.bookingId),
    idempotencyIdx: uniqueIndex('payments_idempotency_idx').on(table.idempotencyKey),
  })
);

// ----------------------------------------------------
// 18. PAYOUTS
// ----------------------------------------------------
export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull(),
    performerId: uuid('performer_id')
      .references(() => users.id)
      .notNull(),
    amount: integer('amount').notNull(), // in kopecks
    taxStatus: text('tax_status').default('demo_unregistered').notNull(),
    status: text('status').default('pending').notNull(), // 'pending', 'transferred', 'cancelled'
    providerReference: text('provider_reference'),
  },
  (table) => ({
    performerIdx: index('payouts_performer_idx').on(table.performerId),
  })
);

// ----------------------------------------------------
// 19. AUDIT LOGS (Minimal technical logs, strictly zero PII)
// ----------------------------------------------------
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    correlationId: text('correlation_id'),
    redactedDiff: jsonb('redacted_diff').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
    actorIdx: index('audit_logs_actor_idx').on(table.actorId, table.createdAt),
  })
);
