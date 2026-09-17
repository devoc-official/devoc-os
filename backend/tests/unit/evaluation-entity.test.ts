import { describe, it, expect } from 'vitest';
import { validateStateTransition } from '../../src/modules/evaluation/domain/evaluation.entity.js';
import { validateCriterionValue } from '../../src/modules/evaluation/domain/evaluation-template.entity.js';

describe('Milestone 8 — Evaluation Entity & Domain Logic Unit Tests', () => {
  it('should allow valid lifecycle state transitions', () => {
    expect(() => validateStateTransition('Draft', 'Scheduled')).not.toThrow();
    expect(() => validateStateTransition('Draft', 'InProgress')).not.toThrow();
    expect(() => validateStateTransition('Draft', 'Cancelled')).not.toThrow();
    expect(() => validateStateTransition('Scheduled', 'InProgress')).not.toThrow();
    expect(() => validateStateTransition('InProgress', 'Submitted')).not.toThrow();
    expect(() => validateStateTransition('Submitted', 'Completed')).not.toThrow();
    expect(() => validateStateTransition('Submitted', 'Draft')).not.toThrow(); // Reopen path
    expect(() => validateStateTransition('Completed', 'Draft')).not.toThrow(); // Controlled reopen path
  });

  it('should throw validation error on invalid lifecycle state transitions', () => {
    expect(() => validateStateTransition('Completed', 'InProgress')).toThrow();
    expect(() => validateStateTransition('Completed', 'Submitted')).toThrow();
    expect(() => validateStateTransition('Cancelled', 'Draft')).toThrow();
    expect(() => validateStateTransition('Draft', 'Completed')).toThrow();
  });

  it('should validate numeric criterion values', () => {
    expect(() => validateCriterionValue('numeric', '4.5')).not.toThrow();
    expect(() => validateCriterionValue('numeric', '100')).not.toThrow();
    expect(() => validateCriterionValue('numeric', 'invalid_num')).toThrow();
    expect(() => validateCriterionValue('numeric', '')).toThrow();
  });

  it('should validate rating and qualitative criterion values', () => {
    expect(() => validateCriterionValue('rating', 'Strong')).not.toThrow();
    expect(() => validateCriterionValue('qualitative', 'Demonstrated great leadership.')).not.toThrow();
    expect(() => validateCriterionValue('rating', '   ')).toThrow();
  });
});
