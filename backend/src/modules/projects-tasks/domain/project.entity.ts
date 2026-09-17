import { ValidationError } from '../../../shared/errors/index.js';

export type ProjectStatus =
  | 'idea'
  | 'research'
  | 'planning'
  | 'development'
  | 'testing'
  | 'beta'
  | 'released'
  | 'maintenance'
  | 'archived';

export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low';

export type ProjectOwnershipType =
  | 'accountable'
  | 'business_owner'
  | 'product_owner'
  | 'technical_owner';

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description?: string | null;
  projectType: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startAt?: Date | null;
  targetEndAt?: Date | null;
  actualEndAt?: Date | null;
  createdByPersonId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectOwner {
  id: string;
  organizationId: string;
  projectId: string;
  personId: string;
  ownershipType: ProjectOwnershipType;
  startAt?: Date | null;
  endAt?: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectBusinessUnit {
  organizationId: string;
  projectId: string;
  businessUnitId: string;
  createdAt: Date;
}

export const CANONICAL_PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  idea: ['research'],
  research: ['planning'],
  planning: ['development'],
  development: ['testing'],
  testing: ['beta', 'development'], // forward or controlled rollback
  beta: ['released', 'development'], // forward or controlled rollback
  released: ['maintenance'],
  maintenance: ['archived', 'development'], // forward or controlled rollback
  archived: [], // terminal
};

export function canTransitionProjectStatus(
  currentStatus: ProjectStatus,
  targetStatus: ProjectStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = CANONICAL_PROJECT_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function validateProjectDates(startAt?: Date | null, targetEndAt?: Date | null): void {
  if (startAt && targetEndAt && targetEndAt.getTime() <= startAt.getTime()) {
    throw new ValidationError('Project target end date must be after start date');
  }
}

export function validateProjectKey(key: string): void {
  if (!key || key.trim().length === 0) {
    throw new ValidationError('Project key is required');
  }
  const keyRegex = /^[A-Z0-9_-]{2,50}$/i;
  if (!keyRegex.test(key.trim())) {
    throw new ValidationError(
      'Project key must be 2-50 alphanumeric characters (hyphens and underscores permitted)'
    );
  }
}
