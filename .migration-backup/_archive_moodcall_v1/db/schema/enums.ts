import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['client', 'performer', 'moderator', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);
export const moderationStatusEnum = pgEnum('moderation_status', ['pending', 'approved', 'rejected']);

export const bookingStatusEnum = pgEnum('booking_status', [
  'draft',
  'pending_payment',
  'paid_pending_acceptance',
  'accepted',
  'declined',
  'expired',
  'cancelled_by_client',
  'cancelled_by_performer',
  'en_route',
  'arrived',
  'in_progress',
  'completed',
  'review_pending',
  'refunded_partial',
  'safety_review',
  'disputed',
  'resolved_refund',
  'resolved_no_refund',
  'blocked',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'authorized',
  'succeeded',
  'cancelled',
  'refunded',
]);

export const reportPriorityEnum = pgEnum('report_priority', [
  'p0_emergency',
  'p1_high',
  'p2_medium',
  'p3_low',
]);

export const reportCategoryEnum = pgEnum('report_category', [
  'sexual_harassment',
  'private_place_solicitation',
  'extortion_or_threats',
  'drugs_or_weapons',
  'no_show',
  'inappropriate_behavior',
  'other',
]);
