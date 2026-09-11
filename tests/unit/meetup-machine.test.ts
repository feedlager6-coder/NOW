import { describe, it, expect } from 'vitest';
import {
  canTransitionMeetup,
  transitionMeetup,
  canJoinMeetup,
  MeetupStatus,
} from '@/domain/meetup-machine';

describe('Meetup State Machine Tests', () => {
  it('should allow legal transitions according to the FSM matrix', () => {
    expect(canTransitionMeetup('gathering', 'active')).toBe(true);
    expect(canTransitionMeetup('gathering', 'cancelled_by_creator')).toBe(true);
    expect(canTransitionMeetup('active', 'completed')).toBe(true);
    expect(canTransitionMeetup('completed', 'archived')).toBe(true);
  });

  it('should reject illegal transitions', () => {
    expect(canTransitionMeetup('completed', 'active')).toBe(false);
    expect(canTransitionMeetup('active', 'gathering')).toBe(false);
    expect(canTransitionMeetup('cancelled_by_creator', 'gathering')).toBe(false);
    expect(canTransitionMeetup('archived', 'draft')).toBe(false);
  });

  it('should prevent transitioning to "active" if quorum (min 2 participants) is not reached', () => {
    const context = {
      meetupId: 'm-1',
      creatorId: 'user-creator',
      actorId: 'user-creator',
      currentParticipantCount: 1, // Only 1 person!
      capacity: 4,
      startsAt: new Date(),
    };

    const result = transitionMeetup('gathering', 'active', context);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('QUORUM_NOT_MET');
  });

  it('should allow transitioning to "active" when quorum is satisfied (>= 2)', () => {
    const context = {
      meetupId: 'm-1',
      creatorId: 'user-creator',
      actorId: 'user-creator',
      currentParticipantCount: 2,
      capacity: 4,
      startsAt: new Date(),
    };

    const result = transitionMeetup('gathering', 'active', context);
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe('active');
  });

  it('should reject cancelled_by_creator if actor is not the creator', () => {
    const context = {
      meetupId: 'm-1',
      creatorId: 'user-creator',
      actorId: 'user-intruder',
      currentParticipantCount: 3,
      capacity: 4,
      startsAt: new Date(),
    };

    const result = transitionMeetup('gathering', 'cancelled_by_creator', context);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN_ACTOR');
  });

  it('should correctly validate capacity joining limits', () => {
    const meetup = {
      status: 'gathering' as MeetupStatus,
      capacity: 4,
      startsAt: new Date(),
    };

    expect(canJoinMeetup(meetup, 3).allowed).toBe(true);
    expect(canJoinMeetup(meetup, 4).allowed).toBe(false);
    expect(canJoinMeetup(meetup, 4).reason).toContain('capacity');

    const completedMeetup = {
      status: 'completed' as MeetupStatus,
      capacity: 4,
      startsAt: new Date(),
    };
    expect(canJoinMeetup(completedMeetup, 2).allowed).toBe(false);
  });
});
