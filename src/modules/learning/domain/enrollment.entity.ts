import { InvalidStateTransitionError } from '../../../shared/errors/index.js';

export type EnrollmentStatus = 'pending' | 'active' | 'paused' | 'completed' | 'withdrawn' | 'cancelled';
export type RoadmapItemStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface LearningEnrollmentProps {
  id: string;
  organizationId: string;
  personId: string;
  learningProgramId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  startedAt?: Date | null;
  expectedEndAt?: Date | null;
  completedAt?: Date | null;
  withdrawnAt?: Date | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnrollmentMilestoneProps {
  id: string;
  organizationId: string;
  enrollmentId: string;
  sourceMilestoneId?: string | null;
  title: string;
  description?: string | null;
  sequence: number;
  status: RoadmapItemStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningActivityProps {
  id: string;
  organizationId: string;
  enrollmentMilestoneId: string;
  sourceActivityId?: string | null;
  title: string;
  description?: string | null;
  activityType: string;
  sequence: number;
  status: RoadmapItemStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningActivityReferenceProps {
  id: string;
  organizationId: string;
  learningActivityId: string;
  referenceType: 'project' | 'task';
  referenceId: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class LearningEnrollment {
  constructor(private props: LearningEnrollmentProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get personId(): string { return this.props.personId; }
  get learningProgramId(): string { return this.props.learningProgramId; }
  get status(): EnrollmentStatus { return this.props.status; }
  get enrolledAt(): Date { return this.props.enrolledAt; }
  get startedAt(): Date | null | undefined { return this.props.startedAt; }
  get expectedEndAt(): Date | null | undefined { return this.props.expectedEndAt; }
  get completedAt(): Date | null | undefined { return this.props.completedAt; }
  get withdrawnAt(): Date | null | undefined { return this.props.withdrawnAt; }
  get metadata(): Record<string, any> { return this.props.metadata || {}; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  public activate(): void {
    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(`Cannot activate an enrollment in terminal state '${this.props.status}'`);
    }
    if (this.props.status === 'active') {
      return;
    }
    this.props.status = 'active';
    if (!this.props.startedAt) {
      this.props.startedAt = new Date();
    }
    this.props.updatedAt = new Date();
  }

  public pause(): void {
    if (this.props.status !== 'active') {
      throw new InvalidStateTransitionError(`Cannot pause an enrollment that is not active (current: ${this.props.status})`);
    }
    this.props.status = 'paused';
    this.props.updatedAt = new Date();
  }

  public resume(): void {
    if (this.props.status !== 'paused') {
      throw new InvalidStateTransitionError(`Cannot resume an enrollment that is not paused (current: ${this.props.status})`);
    }
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  public complete(): void {
    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(`Cannot complete an enrollment in terminal state '${this.props.status}'`);
    }
    this.props.status = 'completed';
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public withdraw(): void {
    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(`Cannot withdraw an enrollment in terminal state '${this.props.status}'`);
    }
    this.props.status = 'withdrawn';
    this.props.withdrawnAt = new Date();
    this.props.updatedAt = new Date();
  }

  public cancel(): void {
    if (this.isTerminal()) {
      throw new InvalidStateTransitionError(`Cannot cancel an enrollment in terminal state '${this.props.status}'`);
    }
    this.props.status = 'cancelled';
    this.props.updatedAt = new Date();
  }

  public isTerminal(): boolean {
    return ['completed', 'withdrawn', 'cancelled'].includes(this.props.status);
  }

  public toJSON(): LearningEnrollmentProps {
    return { ...this.props };
  }
}

export class EnrollmentMilestone {
  constructor(private props: EnrollmentMilestoneProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get enrollmentId(): string { return this.props.enrollmentId; }
  get sourceMilestoneId(): string | null | undefined { return this.props.sourceMilestoneId; }
  get title(): string { return this.props.title; }
  get description(): string | null | undefined { return this.props.description; }
  get sequence(): number { return this.props.sequence; }
  get status(): RoadmapItemStatus { return this.props.status; }
  get startedAt(): Date | null | undefined { return this.props.startedAt; }
  get completedAt(): Date | null | undefined { return this.props.completedAt; }
  get metadata(): Record<string, any> { return this.props.metadata || {}; }

  public activate(): void {
    if (this.props.status === 'completed' || this.props.status === 'skipped') {
      throw new InvalidStateTransitionError(`Cannot activate a milestone that is already ${this.props.status}`);
    }
    this.props.status = 'active';
    if (!this.props.startedAt) {
      this.props.startedAt = new Date();
    }
    this.props.updatedAt = new Date();
  }

  public complete(): void {
    this.props.status = 'completed';
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public skip(): void {
    this.props.status = 'skipped';
    this.props.updatedAt = new Date();
  }

  public toJSON(): EnrollmentMilestoneProps {
    return { ...this.props };
  }
}

export class LearningActivity {
  constructor(private props: LearningActivityProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get enrollmentMilestoneId(): string { return this.props.enrollmentMilestoneId; }
  get sourceActivityId(): string | null | undefined { return this.props.sourceActivityId; }
  get title(): string { return this.props.title; }
  get description(): string | null | undefined { return this.props.description; }
  get activityType(): string { return this.props.activityType; }
  get sequence(): number { return this.props.sequence; }
  get status(): RoadmapItemStatus { return this.props.status; }
  get startedAt(): Date | null | undefined { return this.props.startedAt; }
  get completedAt(): Date | null | undefined { return this.props.completedAt; }
  get metadata(): Record<string, any> { return this.props.metadata || {}; }

  public activate(): void {
    if (this.props.status === 'completed' || this.props.status === 'skipped') {
      throw new InvalidStateTransitionError(`Cannot activate an activity that is already ${this.props.status}`);
    }
    this.props.status = 'active';
    if (!this.props.startedAt) {
      this.props.startedAt = new Date();
    }
    this.props.updatedAt = new Date();
  }

  public complete(): void {
    this.props.status = 'completed';
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public skip(): void {
    this.props.status = 'skipped';
    this.props.updatedAt = new Date();
  }

  public toJSON(): LearningActivityProps {
    return { ...this.props };
  }
}
