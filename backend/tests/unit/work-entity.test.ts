import { describe, it, expect } from 'vitest';
import {
  WorkStatus,
  canTransitionWorkStatus,
  validateWorkTimestampsAndDuration,
  validateTargetPair,
} from '../../src/modules/work/domain/work.entity.js';
import { ValidationError } from '../../src/shared/errors/index.js';

describe('Work Domain Rules Unit Tests', () => {
  describe('Work Lifecycle Status Transitions', () => {
    it('allows valid transitions according to state machine', () => {
      // draft -> submitted -> approved
      expect(canTransitionWorkStatus('draft', 'submitted')).toBe(true);
      expect(canTransitionWorkStatus('submitted', 'approved')).toBe(true);

      // submitted -> rejected -> draft
      expect(canTransitionWorkStatus('submitted', 'rejected')).toBe(true);
      expect(canTransitionWorkStatus('rejected', 'draft')).toBe(true);

      // draft/submitted -> cancelled
      expect(canTransitionWorkStatus('draft', 'cancelled')).toBe(true);
      expect(canTransitionWorkStatus('submitted', 'cancelled')).toBe(true);
    });

    it('disallows invalid transitions', () => {
      // Direct draft -> approved
      expect(canTransitionWorkStatus('draft', 'approved')).toBe(false);
      // Terminal approved -> anything
      expect(canTransitionWorkStatus('approved', 'draft')).toBe(false);
      expect(canTransitionWorkStatus('approved', 'submitted')).toBe(false);
      expect(canTransitionWorkStatus('approved', 'cancelled')).toBe(false);
      // Terminal cancelled -> anything
      expect(canTransitionWorkStatus('cancelled', 'draft')).toBe(false);
      expect(canTransitionWorkStatus('cancelled', 'submitted')).toBe(false);
      expect(canTransitionWorkStatus('cancelled', 'approved')).toBe(false);
      // Rejected -> approved directly
      expect(canTransitionWorkStatus('rejected', 'approved')).toBe(false);
    });
  });

  describe('Work Timestamps and Duration Validation', () => {
    it('accepts valid positive duration without timestamps', () => {
      const result = validateWorkTimestampsAndDuration(undefined, undefined, 120);
      expect(result.durationMinutes).toBe(120);
    });

    it('calculates durationMinutes when timestamps are provided without duration', () => {
      const startedAt = new Date('2026-09-10T10:00:00Z');
      const endedAt = new Date('2026-09-10T12:00:00Z'); // 2 hours = 120 mins
      const result = validateWorkTimestampsAndDuration(startedAt, endedAt, undefined);
      expect(result.durationMinutes).toBe(120);
      expect(result.startedAt).toEqual(startedAt);
      expect(result.endedAt).toEqual(endedAt);
    });

    it('accepts matching timestamps and duration', () => {
      const startedAt = new Date('2026-09-10T10:00:00Z');
      const endedAt = new Date('2026-09-10T11:30:00Z'); // 90 mins
      const result = validateWorkTimestampsAndDuration(startedAt, endedAt, 90);
      expect(result.durationMinutes).toBe(90);
    });

    it('throws error if durationMinutes is not positive', () => {
      expect(() => validateWorkTimestampsAndDuration(undefined, undefined, 0)).toThrow(ValidationError);
      expect(() => validateWorkTimestampsAndDuration(undefined, undefined, -30)).toThrow(ValidationError);
    });

    it('throws error if endedAt is before or equal to startedAt', () => {
      const startedAt = new Date('2026-09-10T10:00:00Z');
      const endedAt = new Date('2026-09-10T09:00:00Z');
      expect(() => validateWorkTimestampsAndDuration(startedAt, endedAt, undefined)).toThrow(ValidationError);

      const sameTime = new Date('2026-09-10T10:00:00Z');
      expect(() => validateWorkTimestampsAndDuration(startedAt, sameTime, undefined)).toThrow(ValidationError);
    });

    it('throws error if only one timestamp is provided', () => {
      const startedAt = new Date('2026-09-10T10:00:00Z');
      expect(() => validateWorkTimestampsAndDuration(startedAt, undefined, 60)).toThrow(ValidationError);
      expect(() => validateWorkTimestampsAndDuration(undefined, startedAt, 60)).toThrow(ValidationError);
    });

    it('throws error if timestamps and duration do not match', () => {
      const startedAt = new Date('2026-09-10T10:00:00Z');
      const endedAt = new Date('2026-09-10T12:00:00Z'); // 120 mins
      expect(() => validateWorkTimestampsAndDuration(startedAt, endedAt, 60)).toThrow(ValidationError);
    });
  });

  describe('Work Target Pair Validation', () => {
    it('accepts targetless work (both null/undefined)', () => {
      expect(() => validateTargetPair(null, null)).not.toThrow();
      expect(() => validateTargetPair(undefined, undefined)).not.toThrow();
    });

    it('accepts full target pair (both present)', () => {
      expect(() => validateTargetPair('project', '123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
    });

    it('throws error if only targetType or targetId is supplied', () => {
      expect(() => validateTargetPair('project', null)).toThrow(ValidationError);
      expect(() => validateTargetPair(null, '123e4567-e89b-12d3-a456-426614174000')).toThrow(ValidationError);
    });
  });
});
