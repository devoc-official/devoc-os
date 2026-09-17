import { ValidationError } from '../../../shared/errors/index.js';

export type WorkStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';

export interface WorkCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkRecord {
  id: string;
  organizationId: string;
  personId: string;
  targetType?: string | null;
  targetId?: string | null;
  assignmentId?: string | null;
  categoryId: string;
  title: string;
  description?: string | null;
  status: WorkStatus;
  startedAt?: Date | null;
  endedAt?: Date | null;
  durationMinutes: number;
  createdByPersonId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkEvidence {
  id: string;
  organizationId: string;
  workRecordId: string;
  evidenceType: string;
  title?: string | null;
  referenceUri?: string | null;
  provider?: string | null;
  externalId?: string | null;
  description?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Outcome {
  id: string;
  organizationId: string;
  outcomeType: string;
  title: string;
  description?: string | null;
  measurableValue?: number | null;
  measurableUnit?: string | null;
  metadata: Record<string, unknown>;
  createdByPersonId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOutcome {
  workRecordId: string;
  outcomeId: string;
  contributionType?: string | null;
  contributionValue?: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export const CANONICAL_WORK_TRANSITIONS: Record<WorkStatus, WorkStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['approved', 'rejected', 'cancelled'],
  rejected: ['draft', 'submitted'],
  approved: [], // terminal
  cancelled: [], // terminal
};

export function canTransitionWorkStatus(
  currentStatus: WorkStatus,
  targetStatus: WorkStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = CANONICAL_WORK_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function validateWorkTimestampsAndDuration(
  startedAt?: Date | null,
  endedAt?: Date | null,
  durationMinutes?: number
): { startedAt?: Date | null; endedAt?: Date | null; durationMinutes: number } {
  if ((startedAt && !endedAt) || (!startedAt && endedAt)) {
    throw new ValidationError('Both startedAt and endedAt must be provided together or both omitted');
  }

  let calculatedDuration = durationMinutes;

  if (startedAt && endedAt) {
    if (endedAt.getTime() <= startedAt.getTime()) {
      throw new ValidationError('Work ended timestamp must be after started timestamp');
    }
    const diffMins = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
    if (durationMinutes !== undefined && durationMinutes !== diffMins) {
      throw new ValidationError('Supplied duration does not match calculated duration from timestamps');
    }
    calculatedDuration = diffMins;
  }

  if (calculatedDuration === undefined || calculatedDuration <= 0) {
    throw new ValidationError('Work duration must be a positive integer in minutes');
  }

  return { startedAt, endedAt, durationMinutes: calculatedDuration };
}

export function validateTargetPair(targetType?: string | null, targetId?: string | null): void {
  if ((targetType && !targetId) || (!targetType && targetId)) {
    throw new ValidationError('targetType and targetId must both be provided or both omitted');
  }
}
