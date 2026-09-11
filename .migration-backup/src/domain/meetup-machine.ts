export type MeetupStatus =
  | 'draft'
  | 'scheduled'
  | 'gathering'
  | 'active'
  | 'completed'
  | 'cancelled_by_creator'
  | 'cancelled_by_system'
  | 'safety_review'
  | 'archived';

export interface MeetupContext {
  meetupId: string;
  creatorId: string;
  actorId: string;
  currentParticipantCount: number;
  capacity: number;
  startsAt: Date;
  now?: Date;
}

export interface TransitionResult {
  success: boolean;
  newStatus?: MeetupStatus;
  errorCode?: string;
  errorMessage?: string;
}

// Allowed state transitions table
export const ALLOWED_TRANSITIONS: Record<MeetupStatus, MeetupStatus[]> = {
  draft: ['scheduled', 'gathering', 'cancelled_by_creator'],
  scheduled: ['gathering', 'cancelled_by_creator', 'cancelled_by_system'],
  gathering: ['active', 'cancelled_by_creator', 'cancelled_by_system', 'safety_review'],
  active: ['completed', 'safety_review', 'cancelled_by_system'],
  completed: ['archived'],
  cancelled_by_creator: ['archived'],
  cancelled_by_system: ['archived'],
  safety_review: ['completed', 'cancelled_by_system', 'archived'],
  archived: [],
};

export function canTransitionMeetup(
  fromStatus: MeetupStatus,
  toStatus: MeetupStatus
): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}

export function transitionMeetup(
  currentStatus: MeetupStatus,
  targetStatus: MeetupStatus,
  context: MeetupContext
): TransitionResult {
  if (!canTransitionMeetup(currentStatus, targetStatus)) {
    return {
      success: false,
      errorCode: 'INVALID_TRANSITION',
      errorMessage: `Cannot transition meetup from "${currentStatus}" to "${targetStatus}"`,
    };
  }

  // Quorum validation for transition to 'active'
  if (targetStatus === 'active') {
    const minParticipants = 2;
    if (context.currentParticipantCount < minParticipants) {
      return {
        success: false,
        errorCode: 'QUORUM_NOT_MET',
        errorMessage: `Cannot activate meetup: minimum ${minParticipants} participants required, currently have ${context.currentParticipantCount}`,
      };
    }
  }

  // Creator authorization check for creator cancellation
  if (targetStatus === 'cancelled_by_creator') {
    if (context.actorId !== context.creatorId) {
      return {
        success: false,
        errorCode: 'FORBIDDEN_ACTOR',
        errorMessage: 'Only the meetup creator can cancel with this action',
      };
    }
  }

  return {
    success: true,
    newStatus: targetStatus,
  };
}

export function canJoinMeetup(
  meetup: {
    status: MeetupStatus;
    capacity: number;
    startsAt: Date;
  },
  currentParticipantCount: number
): { allowed: boolean; reason?: string } {
  if (meetup.status !== 'gathering' && meetup.status !== 'scheduled') {
    return {
      allowed: false,
      reason: `Cannot join meetup with status "${meetup.status}"`,
    };
  }

  if (currentParticipantCount >= meetup.capacity) {
    return {
      allowed: false,
      reason: 'Meetup capacity is reached',
    };
  }

  return { allowed: true };
}
