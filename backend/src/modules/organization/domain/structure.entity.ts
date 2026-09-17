import { InvalidStateTransitionError, ValidationError } from '../../../shared/errors/index.js';

export type ResourceStatus = 'active' | 'inactive';

export interface BranchProps {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessUnitProps {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentProps {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamProps {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: ResourceStatus;
  isTemporary: boolean;
  departmentId?: string | null;
  businessUnitId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ResourceValidator {
  public static validateCode(code: string): void {
    const codeRegex = /^[A-Z0-9_-]+$/i;
    if (!code || !codeRegex.test(code)) {
      throw new ValidationError('Resource code must contain only alphanumeric characters, underscores, or hyphens.');
    }
  }

  public static validateStatusTransition(current: ResourceStatus, next: ResourceStatus): void {
    if (current === next) return;
    if (!['active', 'inactive'].includes(next)) {
      throw new InvalidStateTransitionError(`Invalid status transition to ${next}`);
    }
  }
}
