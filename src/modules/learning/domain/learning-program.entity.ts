import { InvalidStateTransitionError } from '../../../shared/errors/index.js';

export type ProgramStatus = 'draft' | 'active' | 'archived';

export interface LearningProgramProps {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  status: ProgramStatus;
  version: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgramMilestoneProps {
  id: string;
  organizationId: string;
  learningProgramId: string;
  name: string;
  description?: string | null;
  sequence: number;
  required: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityDefinitionProps {
  id: string;
  organizationId: string;
  milestoneId: string;
  title: string;
  description?: string | null;
  activityType: string;
  sequence: number;
  required: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningProgram {
  constructor(private props: LearningProgramProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get name(): string { return this.props.name; }
  get code(): string { return this.props.code; }
  get description(): string | null | undefined { return this.props.description; }
  get status(): ProgramStatus { return this.props.status; }
  get version(): number { return this.props.version; }
  get metadata(): Record<string, any> { return this.props.metadata || {}; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  public activate(): void {
    if (this.props.status === 'archived') {
      throw new InvalidStateTransitionError('Cannot activate an archived learning program');
    }
    if (this.props.status === 'active') {
      return;
    }
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  public archive(): void {
    if (this.props.status === 'archived') {
      return;
    }
    this.props.status = 'archived';
    this.props.updatedAt = new Date();
  }

  public toJSON(): LearningProgramProps {
    return { ...this.props };
  }
}
