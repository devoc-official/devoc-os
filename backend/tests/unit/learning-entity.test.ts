import { describe, it, expect } from 'vitest';
import { LearningProgram } from '../../src/modules/learning/domain/learning-program.entity.js';
import { LearningEnrollment, EnrollmentMilestone, LearningActivity } from '../../src/modules/learning/domain/enrollment.entity.js';
import { AssessmentAttempt } from '../../src/modules/learning/domain/assessment.entity.js';
import { InvalidStateTransitionError } from '../../src/shared/errors/index.js';

describe('Milestone 7 — Learning Engine Entity Unit Tests', () => {
  describe('LearningProgram State Machine', () => {
    it('should initialize with draft status and allow activation', () => {
      const program = new LearningProgram({
        id: 'prog-1',
        organizationId: 'org-1',
        name: 'Full-Stack Track',
        code: 'PROG-FS',
        status: 'draft',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(program.status).toBe('draft');
      program.activate();
      expect(program.status).toBe('active');
    });

    it('should allow archiving from draft or active, but disallow activation from archived', () => {
      const program = new LearningProgram({
        id: 'prog-1',
        organizationId: 'org-1',
        name: 'Full-Stack Track',
        code: 'PROG-FS',
        status: 'active',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      program.archive();
      expect(program.status).toBe('archived');
      expect(() => program.activate()).toThrow(InvalidStateTransitionError);
    });
  });

  describe('LearningEnrollment State Machine', () => {
    it('should follow lifecycle pending -> active -> paused -> active -> completed', () => {
      const enrollment = new LearningEnrollment({
        id: 'enr-1',
        organizationId: 'org-1',
        personId: 'person-1',
        learningProgramId: 'prog-1',
        status: 'pending',
        enrolledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(enrollment.status).toBe('pending');
      enrollment.activate();
      expect(enrollment.status).toBe('active');
      expect(enrollment.startedAt).toBeDefined();

      enrollment.pause();
      expect(enrollment.status).toBe('paused');

      enrollment.resume();
      expect(enrollment.status).toBe('active');

      enrollment.complete();
      expect(enrollment.status).toBe('completed');
      expect(enrollment.completedAt).toBeDefined();
    });

    it('should prevent transitions from terminal states', () => {
      const enrollment = new LearningEnrollment({
        id: 'enr-1',
        organizationId: 'org-1',
        personId: 'person-1',
        learningProgramId: 'prog-1',
        status: 'completed',
        enrolledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => enrollment.activate()).toThrow(InvalidStateTransitionError);
      expect(() => enrollment.pause()).toThrow(InvalidStateTransitionError);
      expect(() => enrollment.withdraw()).toThrow(InvalidStateTransitionError);
    });
  });

  describe('EnrollmentMilestone & LearningActivity State Machines', () => {
    it('should transition milestone through pending -> active -> completed/skipped', () => {
      const milestone = new EnrollmentMilestone({
        id: 'em-1',
        organizationId: 'org-1',
        enrollmentId: 'enr-1',
        title: 'Core JS',
        sequence: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      milestone.activate();
      expect(milestone.status).toBe('active');

      milestone.complete();
      expect(milestone.status).toBe('completed');
      expect(milestone.completedAt).toBeDefined();
    });

    it('should transition activity through pending -> active -> skipped', () => {
      const activity = new LearningActivity({
        id: 'act-1',
        organizationId: 'org-1',
        enrollmentMilestoneId: 'em-1',
        title: 'Read Documentation',
        activityType: 'reading',
        sequence: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      activity.skip();
      expect(activity.status).toBe('skipped');
    });
  });

  describe('AssessmentAttempt Evaluation', () => {
    it('should grade attempt and update completion state', () => {
      const attempt = new AssessmentAttempt({
        id: 'att-1',
        organizationId: 'org-1',
        assessmentId: 'ass-1',
        personId: 'person-1',
        attemptNumber: 1,
        status: 'submitted',
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      attempt.complete('passed', 90, 'Passed successfully');
      expect(attempt.status).toBe('passed');
      expect(attempt.score).toBe(90);
      expect(attempt.qualitativeResult).toBe('Passed successfully');
      expect(attempt.completedAt).toBeDefined();
    });
  });
});
