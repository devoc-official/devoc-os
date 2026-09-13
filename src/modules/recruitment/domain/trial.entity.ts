import { ValidationError, InvalidStateTransitionError } from '../../../shared/errors/index.js';

export type TrialStatus = 'scheduled' | 'active' | 'completed' | 'terminated';

export interface TrialProps {
  id: string;
  organizationId: string;
  applicationId: string;
  startDate: Date | string;
  endDate: Date | string;
  status: TrialStatus;
  objectives?: string | null;
  deliverablesSummary?: string | null;
  outcomeNotes?: string | null;
  mentorId?: string | null;
  assignmentId?: string | null;
  evaluationId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  isExternalCandidate?: boolean;
}

export class TrialEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly applicationId: string;
  public startDate: Date;
  public endDate: Date;
  public status: TrialStatus;
  public objectives: string | null;
  public deliverablesSummary: string | null;
  public outcomeNotes: string | null;
  public mentorId: string | null;
  public assignmentId: string | null;
  public evaluationId: string | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: TrialProps) {
    this.validate(props);
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.applicationId = props.applicationId;
    this.startDate = new Date(props.startDate);
    this.endDate = new Date(props.endDate);
    this.status = props.status;
    this.objectives = props.objectives ?? null;
    this.deliverablesSummary = props.deliverablesSummary ?? null;
    this.outcomeNotes = props.outcomeNotes ?? null;
    this.mentorId = props.mentorId ?? null;
    this.assignmentId = props.assignmentId ?? null;
    this.evaluationId = props.evaluationId ?? null;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  private validate(props: TrialProps): void {
    if (!props.applicationId) {
      throw new ValidationError('Application ID is required for candidate trial');
    }
    const start = new Date(props.startDate);
    const end = new Date(props.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Valid start and end dates are required for candidate trial');
    }
    if (start > end) {
      throw new ValidationError('Trial start date must be before or equal to end date');
    }
    if (props.isExternalCandidate) {
      if (props.assignmentId) {
        throw new ValidationError('External candidate without M2 Person identity cannot receive an M3 Assignment');
      }
      if (props.evaluationId) {
        throw new ValidationError('External candidate without M2 Person identity cannot receive an M8 Evaluation');
      }
    }
  }

  public activate(): void {
    if (this.status !== 'scheduled') {
      throw new InvalidStateTransitionError(`Cannot activate trial in status '${this.status}'`);
    }
    this.status = 'active';
    this.updatedAt = new Date();
  }

  public complete(deliverablesSummary?: string | null, outcomeNotes?: string | null): void {
    if (this.status !== 'scheduled' && this.status !== 'active') {
      throw new InvalidStateTransitionError(`Cannot complete trial in status '${this.status}'`);
    }
    this.status = 'completed';
    if (deliverablesSummary !== undefined) {
      this.deliverablesSummary = deliverablesSummary;
    }
    if (outcomeNotes !== undefined) {
      this.outcomeNotes = outcomeNotes;
    }
    this.updatedAt = new Date();
  }

  public terminate(outcomeNotes?: string | null): void {
    if (this.status !== 'scheduled' && this.status !== 'active') {
      throw new InvalidStateTransitionError(`Cannot terminate trial in status '${this.status}'`);
    }
    this.status = 'terminated';
    if (outcomeNotes !== undefined) {
      this.outcomeNotes = outcomeNotes;
    }
    this.updatedAt = new Date();
  }
}
