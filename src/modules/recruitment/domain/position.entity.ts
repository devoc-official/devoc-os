import { ValidationError, InvalidStateTransitionError } from '../../../shared/errors/index.js';
import { PositionClosedError } from './recruitment.errors.js';

export type PositionStatus = 'draft' | 'open' | 'paused' | 'closed' | 'archived';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'mentor' | 'freelance';

export interface PositionProps {
  id: string;
  organizationId: string;
  title: string;
  code: string;
  businessUnitId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  targetRoleId?: string | null;
  employmentType: EmploymentType;
  openingsCount: number;
  hiredCount: number;
  hiringManagerId?: string | null;
  recruiterId?: string | null;
  description?: string | null;
  requirements?: string | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency: string;
  targetStartDate?: Date | string | null;
  status: PositionStatus;
  openedAt?: Date | string | null;
  closedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class PositionEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public title: string;
  public code: string;
  public businessUnitId: string | null;
  public departmentId: string | null;
  public teamId: string | null;
  public targetRoleId: string | null;
  public employmentType: EmploymentType;
  public openingsCount: number;
  public hiredCount: number;
  public hiringManagerId: string | null;
  public recruiterId: string | null;
  public description: string | null;
  public requirements: string | null;
  public minSalary: number | null;
  public maxSalary: number | null;
  public currency: string;
  public targetStartDate: Date | null;
  public status: PositionStatus;
  public openedAt: Date | null;
  public closedAt: Date | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: PositionProps) {
    this.validate(props);
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.title = props.title.trim();
    this.code = props.code.trim();
    this.businessUnitId = props.businessUnitId ?? null;
    this.departmentId = props.departmentId ?? null;
    this.teamId = props.teamId ?? null;
    this.targetRoleId = props.targetRoleId ?? null;
    this.employmentType = props.employmentType;
    this.openingsCount = props.openingsCount;
    this.hiredCount = props.hiredCount;
    this.hiringManagerId = props.hiringManagerId ?? null;
    this.recruiterId = props.recruiterId ?? null;
    this.description = props.description ?? null;
    this.requirements = props.requirements ?? null;
    this.minSalary = props.minSalary ?? null;
    this.maxSalary = props.maxSalary ?? null;
    this.currency = props.currency ?? 'USD';
    this.targetStartDate = props.targetStartDate ? new Date(props.targetStartDate) : null;
    this.status = props.status;
    this.openedAt = props.openedAt ? new Date(props.openedAt) : null;
    this.closedAt = props.closedAt ? new Date(props.closedAt) : null;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  private validate(props: PositionProps): void {
    if (!props.title || props.title.trim() === '') {
      throw new ValidationError('Position title is required');
    }
    if (!props.code || props.code.trim() === '') {
      throw new ValidationError('Position code is required');
    }
    if (props.openingsCount < 1) {
      throw new ValidationError('Openings count must be at least 1');
    }
    if (props.hiredCount < 0) {
      throw new ValidationError('Hired count cannot be negative');
    }
    if (props.hiredCount > props.openingsCount) {
      throw new ValidationError('Hired count cannot exceed openings count');
    }
    if (props.minSalary !== undefined && props.minSalary !== null && props.minSalary < 0) {
      throw new ValidationError('Minimum salary cannot be negative');
    }
    if (props.maxSalary !== undefined && props.maxSalary !== null && props.maxSalary < 0) {
      throw new ValidationError('Maximum salary cannot be negative');
    }
    if (
      props.minSalary !== undefined && props.minSalary !== null &&
      props.maxSalary !== undefined && props.maxSalary !== null &&
      props.minSalary > props.maxSalary
    ) {
      throw new ValidationError('Minimum salary cannot exceed maximum salary');
    }
  }

  public open(): void {
    if (this.status === 'closed') {
      throw new PositionClosedError('Closed position is hiring-terminal and cannot be reopened');
    }
    if (this.status === 'archived') {
      throw new InvalidStateTransitionError('Archived position cannot be opened');
    }
    if (this.status === 'open') {
      return;
    }
    this.status = 'open';
    if (!this.openedAt) {
      this.openedAt = new Date();
    }
    this.updatedAt = new Date();
  }

  public pause(): void {
    if (this.status === 'closed') {
      throw new PositionClosedError('Closed position cannot be paused');
    }
    if (this.status === 'archived') {
      throw new InvalidStateTransitionError('Archived position cannot be paused');
    }
    if (this.status !== 'open') {
      throw new InvalidStateTransitionError(`Cannot pause position in status '${this.status}'`);
    }
    this.status = 'paused';
    this.updatedAt = new Date();
  }

  public close(): void {
    if (this.status === 'archived') {
      throw new InvalidStateTransitionError('Archived position cannot be closed');
    }
    if (this.status === 'closed') {
      return;
    }
    this.status = 'closed';
    this.closedAt = new Date();
    this.updatedAt = new Date();
  }

  public archive(): void {
    if (this.status === 'archived') {
      return;
    }
    this.status = 'archived';
    this.updatedAt = new Date();
  }

  public recordHire(): void {
    if (this.status !== 'open') {
      if (this.status === 'closed') {
        throw new PositionClosedError('Cannot hire into a closed position');
      }
      throw new InvalidStateTransitionError(`Cannot hire into a position with status '${this.status}'`);
    }
    if (this.hiredCount >= this.openingsCount) {
      throw new ValidationError('Position has no remaining available openings');
    }
    this.hiredCount += 1;
    if (this.hiredCount === this.openingsCount) {
      this.status = 'closed';
      this.closedAt = new Date();
    }
    this.updatedAt = new Date();
  }
}
