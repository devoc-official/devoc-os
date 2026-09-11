import { ValidationError } from '../../../shared/errors/index.js';

export type EvaluationState = 'Draft' | 'Scheduled' | 'InProgress' | 'Submitted' | 'Completed' | 'Cancelled';

export type FeedbackType = 'text' | 'work_log' | 'meeting' | 'project' | 'learning_program';

export interface Evaluation {
  id: string;
  organizationId: string;
  templateId: string;
  subjectId: string;
  state: EvaluationState;
  scheduledAt?: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  evaluatorIds?: string[];
  criterionResults?: CriterionResult[];
  feedback?: EvaluationFeedback[];
  outcomes?: EvaluationOutcome[];
}

export interface CriterionResult {
  id: string;
  evaluationId: string;
  criterionId: string;
  value: string;
  comments?: string;
  createdAt?: string;
}

export interface EvaluationFeedback {
  id: string;
  evaluationId: string;
  feedbackType: FeedbackType;
  payload: Record<string, any>;
  createdAt?: string;
}

export interface EvaluationOutcome {
  id: string;
  evaluationId: string;
  outcomeKey: string;
  outcomeValue: string;
  createdAt?: string;
}

export interface EvaluationHistorySnapshot {
  id: string;
  evaluationId: string;
  snapshot: Record<string, any>;
  capturedAt: string;
}

export function validateStateTransition(current: EvaluationState, target: EvaluationState): void {
  if (current === target) return;

  if (current === 'Completed') {
    if (target === 'Draft') {
      // Reopen / Correction path
      return;
    }
    throw new ValidationError(`Cannot transition from completed evaluation state '${current}' to '${target}'. Completed evaluations are immutable.`);
  }

  if (current === 'Cancelled') {
    throw new ValidationError(`Cannot transition from terminal evaluation state '${current}' to '${target}'`);
  }

  const allowed: Record<EvaluationState, EvaluationState[]> = {
    Draft: ['Scheduled', 'InProgress', 'Cancelled'],
    Scheduled: ['InProgress', 'Cancelled'],
    InProgress: ['Submitted', 'Cancelled'],
    Submitted: ['Completed', 'Cancelled', 'Draft'],
    Completed: ['Draft'],
    Cancelled: [],
  };

  if (!allowed[current].includes(target)) {
    throw new ValidationError(`Invalid evaluation state transition from '${current}' to '${target}'`);
  }
}
