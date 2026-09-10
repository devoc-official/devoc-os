import { InvalidStateTransitionError, ValidationError } from '../../../shared/errors/index.js';

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
export type EmploymentStatus = 'probation' | 'active' | 'suspended' | 'terminated' | 'resigned';

export interface EmploymentProps {
  id: string;
  organizationId: string;
  personId: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  jobTitle: string;
  departmentId?: string | null;
  businessUnitId?: string | null;
  branchId?: string | null;
  managerId?: string | null;
  startDate: Date;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class EmploymentStateMachine {
  public static validateStatusTransition(currentStatus: EmploymentStatus, nextStatus: EmploymentStatus): void {
    if (currentStatus === nextStatus) return;

    if (['terminated', 'resigned'].includes(currentStatus)) {
      throw new InvalidStateTransitionError(
        `Cannot change employment status from terminal state '${currentStatus}' to '${nextStatus}'.`
      );
    }

    const validTransitions: Record<EmploymentStatus, EmploymentStatus[]> = {
      probation: ['active', 'suspended', 'terminated', 'resigned'],
      active: ['suspended', 'terminated', 'resigned'],
      suspended: ['active', 'terminated', 'resigned'],
      terminated: [],
      resigned: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new InvalidStateTransitionError(
        `Invalid employment status transition from '${currentStatus}' to '${nextStatus}'.`
      );
    }
  }

  public static validateEmploymentType(type: string): void {
    const validTypes: EmploymentType[] = ['full_time', 'part_time', 'contract', 'internship', 'freelance'];
    if (!validTypes.includes(type as EmploymentType)) {
      throw new ValidationError(`Invalid employment type: ${type}`);
    }
  }
}
