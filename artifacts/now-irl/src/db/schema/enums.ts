import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'moderator', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);
export const moderationStatusEnum = pgEnum('moderation_status', ['pending', 'approved', 'rejected']);
export const ageBandEnum = pgEnum('age_band', ['18-21', '22-25', '26-30', '31+']);

export const meetupStatusEnum = pgEnum('meetup_status', [
  'draft',
  'scheduled',
  'gathering',
  'active',
  'completed',
  'cancelled_by_creator',
  'cancelled_by_system',
  'safety_review',
  'archived',
]);

export const participantRoleEnum = pgEnum('participant_role', ['creator', 'participant']);

export const participantStatusEnum = pgEnum('participant_status', [
  'invited',
  'joined',
  'checked_in',
  'left',
  'removed',
  'reported',
]);

export const reportPriorityEnum = pgEnum('report_priority', [
  'p0_emergency',
  'p1_high',
  'p2_medium',
  'p3_low',
]);

export const reportCategoryEnum = pgEnum('report_category', [
  'sexual_solicitation',
  'private_place_solicitation',
  'aggression_or_threats',
  'drugs_or_weapons',
  'no_show_spam',
  'inappropriate_behavior',
  'other',
]);
