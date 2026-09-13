import { ValidationError, InvalidStateTransitionError } from '../../../shared/errors/index.js';

export type ApplicationStatus =
  | 'applied'
  | 'screening'
  | 'assessment'
  | 'interview'
  | 'trial'
  | 'decision'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export interface ApplicationProps {
  id: string;
  organizationId: string;
  candidateId: string;
  positionId: string;
  currentStageId: string;
  status: ApplicationStatus;
  appliedAt: Date | string;
  rejectionReason?: string | null;
  rejectedAt?: Date | string | null;
  withdrawnReason?: string | null;
  withdrawnAt?: Date | string | null;
  hiredAt?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class ApplicationEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly candidateId: string;
  public readonly positionId: string;
  public currentStageId: string;
  public status: ApplicationStatus;
  public readonly appliedAt: Date;
  public rejectionReason: string | null;
  public rejectedAt: Date | null;
  public withdrawnReason: string | null;
  public withdrawnAt: Date | null;
  public hiredAt: Date | null;
  public notes: string | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: ApplicationProps) {
    this.validate(props);
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.candidateId = props.candidateId;
    this.positionId = props.positionId;
    this.currentStageId = props.currentStageId;
    this.status = props.status;
    this.appliedAt = new Date(props.appliedAt);
    this.rejectionReason = props.rejectionReason ?? null;
    this.rejectedAt = props.rejectedAt ? new Date(props.rejectedAt) : null;
    this.withdrawnReason = props.withdrawnReason ?? null;
    this.withdrawnAt = props.withdrawnAt ? new Date(props.withdrawnAt) : null;
    this.hiredAt = props.hiredAt ? new Date(props.hiredAt) : null;
    this.notes = props.notes ?? null;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  private validate(props: ApplicationProps): void {
    if (!props.candidateId) {
      throw new ValidationError('Candidate ID is required');
    }
    if (!props.positionId) {
      throw new ValidationError('Position ID is required');
    }
    if (!props.currentStageId) {
      throw new ValidationError('Current stage ID is required');
    }
  }

  public isTerminal(): boolean {
    return this.status === 'rejected' || this.status === 'withdrawn' || this.status === 'hired';
  }

  public advanceStage(stageId: string, newStatus: ApplicationStatus): void {
    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(`Cannot advance application in terminal status '${this.status}'`);
    }
    if (newStatus === 'rejected' || newStatus === 'withdrawn' || newStatus === 'hired') {
      throw new InvalidStateTransitionError(`Use explicit terminal methods for transition to '${newStatus}'`);
    }
    this.currentStageId = stageId;
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  public markOffered(): void {
    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(`Cannot issue offer for application in terminal status '${this.status}'`);
    }
    this.status = 'offered';
    this.updatedAt = new Date();
  }

  public reject(reason?: string | null): void {
    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(`Application is already in terminal status '${this.status}'`);
    }
    this.status = 'rejected';
    this.rejectionReason = reason ?? null;
    this.rejectedAt = new Date();
    this.updatedAt = new Date();
  }

  public withdraw(reason?: string | null): void {
    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(`Application is already in terminal status '${this.status}'`);
    }
    this.status = 'withdrawn';
    this.withdrawnReason = reason ?? null;
    this.withdrawnAt = new Date();
    this.updatedAt = new Date();
  }

  public markHired(): void {
    if (this.status !== 'offered') {
      throw new InvalidStateTransitionError(`Application must be in status 'offered' to be hired, currently '${this.status}'`);
    }
    this.status = 'hired';
    this.hiredAt = new Date();
    this.updatedAt = new Date();
  }
}
