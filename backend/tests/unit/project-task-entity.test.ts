import { describe, it, expect } from 'vitest';
import {
  canTransitionProjectStatus,
  validateProjectDates,
  validateProjectKey,
  CANONICAL_PROJECT_TRANSITIONS,
} from '../../src/modules/projects-tasks/domain/project.entity.js';
import {
  canTransitionTaskStatus,
  validateTaskDates,
  validateTaskTypeHierarchy,
  detectDependencyCycle,
  VALID_TASK_TRANSITIONS,
} from '../../src/modules/projects-tasks/domain/task.entity.js';
import { ValidationError } from '../../src/shared/errors/index.js';

describe('Milestone 4 — Projects & Tasks Domain Unit Tests', () => {
  describe('Project Domain Logic', () => {
    it('validates canonical project lifecycle state transitions', () => {
      expect(canTransitionProjectStatus('idea', 'research')).toBe(true);
      expect(canTransitionProjectStatus('research', 'planning')).toBe(true);
      expect(canTransitionProjectStatus('planning', 'development')).toBe(true);
      expect(canTransitionProjectStatus('development', 'testing')).toBe(true);
      expect(canTransitionProjectStatus('testing', 'beta')).toBe(true);
      expect(canTransitionProjectStatus('beta', 'released')).toBe(true);
      expect(canTransitionProjectStatus('released', 'maintenance')).toBe(true);
      expect(canTransitionProjectStatus('maintenance', 'archived')).toBe(true);
    });

    it('allows controlled rollbacks to development phase', () => {
      expect(canTransitionProjectStatus('testing', 'development')).toBe(true);
      expect(canTransitionProjectStatus('beta', 'development')).toBe(true);
      expect(canTransitionProjectStatus('maintenance', 'development')).toBe(true);
    });

    it('rejects invalid project status transitions', () => {
      expect(canTransitionProjectStatus('idea', 'released')).toBe(false);
      expect(canTransitionProjectStatus('research', 'testing')).toBe(false);
      expect(canTransitionProjectStatus('archived', 'development')).toBe(false);
    });

    it('treats archived state as terminal', () => {
      const archivedTransitions = CANONICAL_PROJECT_TRANSITIONS.archived;
      expect(archivedTransitions).toHaveLength(0);
      expect(canTransitionProjectStatus('archived', 'idea')).toBe(false);
    });

    it('validates project date ranges', () => {
      const start = new Date('2026-01-01');
      const validEnd = new Date('2026-06-30');
      const invalidEnd = new Date('2025-12-31');

      expect(() => validateProjectDates(start, validEnd)).not.toThrow();
      expect(() => validateProjectDates(start, invalidEnd)).toThrow(ValidationError);
    });

    it('validates project keys correctly', () => {
      expect(() => validateProjectKey('DEVOC')).not.toThrow();
      expect(() => validateProjectKey('PROJ-100')).not.toThrow();
      expect(() => validateProjectKey('a')).toThrow(ValidationError); // too short
      expect(() => validateProjectKey('INVALID KEY WITH SPACES')).toThrow(ValidationError);
    });
  });

  describe('Task Domain Logic', () => {
    it('validates task status state transitions', () => {
      expect(canTransitionTaskStatus('backlog', 'todo')).toBe(true);
      expect(canTransitionTaskStatus('todo', 'in_progress')).toBe(true);
      expect(canTransitionTaskStatus('in_progress', 'in_review')).toBe(true);
      expect(canTransitionTaskStatus('in_review', 'testing')).toBe(true);
      expect(canTransitionTaskStatus('testing', 'done')).toBe(true);
    });

    it('allows blocking and review revisions', () => {
      expect(canTransitionTaskStatus('in_progress', 'blocked')).toBe(true);
      expect(canTransitionTaskStatus('blocked', 'in_progress')).toBe(true);
      expect(canTransitionTaskStatus('in_review', 'changes_requested')).toBe(true);
      expect(canTransitionTaskStatus('changes_requested', 'in_progress')).toBe(true);
    });

    it('rejects invalid task status transitions', () => {
      expect(canTransitionTaskStatus('backlog', 'done')).toBe(false);
      expect(canTransitionTaskStatus('done', 'in_progress')).toBe(false);
      expect(canTransitionTaskStatus('cancelled', 'todo')).toBe(false);
    });

    it('validates task dates', () => {
      const start = new Date('2026-03-01');
      const due = new Date('2026-03-15');
      const invalidDue = new Date('2026-02-28');

      expect(() => validateTaskDates(start, due)).not.toThrow();
      expect(() => validateTaskDates(start, invalidDue)).toThrow(ValidationError);
    });

    it('enforces task hierarchy constraints', () => {
      // Epic cannot have parent
      expect(() => validateTaskTypeHierarchy('epic', 'task')).toThrow(ValidationError);
      // Subtask must have parent
      expect(() => validateTaskTypeHierarchy('subtask', null)).toThrow(ValidationError);
      // Subtask cannot have another subtask as parent
      expect(() => validateTaskTypeHierarchy('subtask', 'subtask')).toThrow(ValidationError);
      // Subtask under task or epic is valid
      expect(() => validateTaskTypeHierarchy('subtask', 'task')).not.toThrow();
      expect(() => validateTaskTypeHierarchy('subtask', 'epic')).not.toThrow();
    });

    it('detects circular dependency chains correctly using DFS graph traversal', () => {
      const existingDependencies = [
        { taskId: 'task-B', dependsOnTaskId: 'task-A' }, // B depends on A
        { taskId: 'task-C', dependsOnTaskId: 'task-B' }, // C depends on B
      ];

      // Adding A depends on C would create loop: A -> C -> B -> A
      expect(detectDependencyCycle(existingDependencies, 'task-A', 'task-C')).toBe(true);

      // Self-dependency
      expect(detectDependencyCycle(existingDependencies, 'task-A', 'task-A')).toBe(true);

      // Non-circular addition: D depends on C (no cycle)
      expect(detectDependencyCycle(existingDependencies, 'task-D', 'task-C')).toBe(false);
    });
  });
});
