import { describe, it, expect } from 'vitest';
import {
  canTransitionAssignmentStatus,
  validateAssignmentDates,
  validateActivationTime,
} from '../../src/modules/assignments/domain/assignment.entity.js';
import { TargetResolverRegistry } from '../../src/modules/assignments/domain/target-resolver.registry.js';
import { ValidationError } from '../../src/shared/errors/index.js';

describe('Assignment Engine Domain Unit Tests', () => {
  it('allows valid assignment lifecycle transitions', () => {
    expect(canTransitionAssignmentStatus('scheduled', 'active')).toBe(true);
    expect(canTransitionAssignmentStatus('scheduled', 'cancelled')).toBe(true);
    expect(canTransitionAssignmentStatus('active', 'paused')).toBe(true);
    expect(canTransitionAssignmentStatus('active', 'completed')).toBe(true);
    expect(canTransitionAssignmentStatus('active', 'cancelled')).toBe(true);
    expect(canTransitionAssignmentStatus('paused', 'active')).toBe(true);
    expect(canTransitionAssignmentStatus('paused', 'completed')).toBe(true);
    expect(canTransitionAssignmentStatus('paused', 'cancelled')).toBe(true);
  });

  it('rejects invalid assignment lifecycle transitions out of terminal states', () => {
    expect(canTransitionAssignmentStatus('completed', 'active')).toBe(false);
    expect(canTransitionAssignmentStatus('completed', 'paused')).toBe(false);
    expect(canTransitionAssignmentStatus('cancelled', 'active')).toBe(false);
    expect(canTransitionAssignmentStatus('cancelled', 'completed')).toBe(false);
  });

  it('validates start and end dates correctly', () => {
    const start = new Date('2026-09-01');
    const validEnd = new Date('2026-12-31');
    const invalidEnd = new Date('2026-08-31');

    expect(() => validateAssignmentDates(start, validEnd)).not.toThrow();
    expect(() => validateAssignmentDates(start, invalidEnd)).toThrow(ValidationError);
  });

  it('rejects active status when start date is in the future', () => {
    const futureDate = new Date(Date.now() + 86400000); // tomorrow
    const pastDate = new Date(Date.now() - 86400000); // yesterday

    expect(() => validateActivationTime('active', pastDate)).not.toThrow();
    expect(() => validateActivationTime('active', futureDate)).toThrow(ValidationError);
    expect(() => validateActivationTime('scheduled', futureDate)).not.toThrow();
  });

  it('validates supported target types in TargetResolverRegistry', () => {
    const registry = TargetResolverRegistry.getInstance();
    expect(registry.isSupportedType('project')).toBe(true);
    expect(registry.isSupportedType('task')).toBe(true);
    expect(registry.isSupportedType('business_unit')).toBe(true);
    expect(registry.isSupportedType('department')).toBe(true);
    expect(registry.isSupportedType('team')).toBe(true);
    expect(registry.isSupportedType('learning_program')).toBe(true);
    expect(registry.isSupportedType('student')).toBe(true);
    expect(registry.isSupportedType('unsupported_type')).toBe(false);
  });
});
