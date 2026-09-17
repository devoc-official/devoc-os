import { ValidationError } from '../../../shared/errors/index.js';

export type AssignmentStatus = 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';

export type CapacityType = 'allocation' | 'workload';

export type AuthorityType =
  | 'platform_admin'
  | 'org_admin'
  | 'founder'
  | 'business_unit_head'
  | 'department_head'
  | 'project_manager'
  | 'academy_head'
  | 'team_lead';

export interface Assignment {
  id: string;
  organizationId: string;
  personId: string;
  targetType: string;
  targetId: string;
  assignmentType: string;
  roleContext?: string | null;
  status: AssignmentStatus;
  startAt: Date;
  endAt?: Date | null;
  capacityType: CapacityType;
  capacityValue: number;
  capacityUnit: string;
  authorityType: AuthorityType;
  assignedByPersonId?: string | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentHistory {
  id: string;
  organizationId: string;
  assignmentId: string;
  previousStatus?: AssignmentStatus | null;
  newStatus: AssignmentStatus;
  reason?: string | null;
  actorUserId?: string | null;
  actorPersonId?: string | null;
  changedAt: Date;
  metadata: Record<string, unknown>;
}

export const VALID_STATUS_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  scheduled: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransitionAssignmentStatus(
  currentStatus: AssignmentStatus,
  targetStatus: AssignmentStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function validateAssignmentDates(startAt: Date, endAt?: Date | null): void {
  if (endAt && endAt.getTime() <= startAt.getTime()) {
    throw new ValidationError('Assignment end date must be after start date');
  }
}

export function validateActivationTime(status: AssignmentStatus, startAt: Date, now: Date = new Date()): void {
  if (status === 'active' && startAt.getTime() > now.getTime()) {
    throw new ValidationError('Assignment cannot be active before its planned start date');
  }
}
