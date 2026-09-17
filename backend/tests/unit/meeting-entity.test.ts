import { describe, it, expect } from 'vitest';
import {
  canTransitionMeetingStatus,
  validateMeetingTimestamps,
} from '../../src/modules/meetings/domain/meeting.entity.js';
import { ValidationError } from '../../src/shared/errors/index.js';

describe('Meetings Domain Rules Unit Tests', () => {
  describe('Meeting Lifecycle Status Transitions', () => {
    it('allows valid transitions according to state machine', () => {
      // scheduled -> in_progress -> completed
      expect(canTransitionMeetingStatus('scheduled', 'in_progress')).toBe(true);
      expect(canTransitionMeetingStatus('in_progress', 'completed')).toBe(true);

      // scheduled -> completed directly
      expect(canTransitionMeetingStatus('scheduled', 'completed')).toBe(true);

      // scheduled / in_progress -> cancelled
      expect(canTransitionMeetingStatus('scheduled', 'cancelled')).toBe(true);
      expect(canTransitionMeetingStatus('in_progress', 'cancelled')).toBe(true);
    });

    it('disallows invalid transitions from terminal states', () => {
      // Terminal completed -> anything
      expect(canTransitionMeetingStatus('completed', 'scheduled')).toBe(false);
      expect(canTransitionMeetingStatus('completed', 'in_progress')).toBe(false);
      expect(canTransitionMeetingStatus('completed', 'cancelled')).toBe(false);

      // Terminal cancelled -> anything
      expect(canTransitionMeetingStatus('cancelled', 'scheduled')).toBe(false);
      expect(canTransitionMeetingStatus('cancelled', 'in_progress')).toBe(false);
      expect(canTransitionMeetingStatus('cancelled', 'completed')).toBe(false);
    });
  });

  describe('Meeting Timestamps Validation', () => {
    it('accepts valid scheduled timestamps where end is after start', () => {
      const start = new Date('2026-09-15T10:00:00Z');
      const end = new Date('2026-09-15T11:00:00Z');
      expect(() => validateMeetingTimestamps(start, end)).not.toThrow();
    });

    it('throws ValidationError if scheduled end is equal to or before start', () => {
      const start = new Date('2026-09-15T10:00:00Z');
      const sameEnd = new Date('2026-09-15T10:00:00Z');
      const earlierEnd = new Date('2026-09-15T09:00:00Z');

      expect(() => validateMeetingTimestamps(start, sameEnd)).toThrow(ValidationError);
      expect(() => validateMeetingTimestamps(start, earlierEnd)).toThrow(ValidationError);
    });

    it('validates actual timestamps ordering when supplied', () => {
      const schStart = new Date('2026-09-15T10:00:00Z');
      const schEnd = new Date('2026-09-15T11:00:00Z');

      const actStart = new Date('2026-09-15T10:05:00Z');
      const actEnd = new Date('2026-09-15T11:02:00Z');
      expect(() => validateMeetingTimestamps(schStart, schEnd, actStart, actEnd)).not.toThrow();

      const invalidActEnd = new Date('2026-09-15T10:00:00Z');
      expect(() => validateMeetingTimestamps(schStart, schEnd, actStart, invalidActEnd)).toThrow(ValidationError);
    });
  });
});
