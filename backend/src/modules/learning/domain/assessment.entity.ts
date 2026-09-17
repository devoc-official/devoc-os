export type AttemptStatus = 'submitted' | 'graded' | 'passed' | 'failed';

export interface LearningAssessmentProps {
  id: string;
  organizationId: string;
  enrollmentId: string;
  learningActivityId?: string | null;
  title: string;
  description?: string | null;
  assessmentType: string;
  status: string;
  maxScore?: number | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentAttemptProps {
  id: string;
  organizationId: string;
  assessmentId: string;
  personId: string;
  attemptNumber: number;
  status: AttemptStatus;
  score?: number | null;
  qualitativeResult?: string | null;
  submittedAt: Date;
  completedAt?: Date | null;
  evidenceMetadata?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningAssessment {
  constructor(private props: LearningAssessmentProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get enrollmentId(): string { return this.props.enrollmentId; }
  get learningActivityId(): string | null | undefined { return this.props.learningActivityId; }
  get title(): string { return this.props.title; }
  get description(): string | null | undefined { return this.props.description; }
  get assessmentType(): string { return this.props.assessmentType; }
  get status(): string { return this.props.status; }
  get maxScore(): number | null | undefined { return this.props.maxScore; }
  get metadata(): Record<string, any> { return this.props.metadata || {}; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  public toJSON(): LearningAssessmentProps {
    return { ...this.props };
  }
}

export class AssessmentAttempt {
  constructor(private props: AssessmentAttemptProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get assessmentId(): string { return this.props.assessmentId; }
  get personId(): string { return this.props.personId; }
  get attemptNumber(): number { return this.props.attemptNumber; }
  get status(): AttemptStatus { return this.props.status; }
  get score(): number | null | undefined { return this.props.score; }
  get qualitativeResult(): string | null | undefined { return this.props.qualitativeResult; }
  get submittedAt(): Date { return this.props.submittedAt; }
  get completedAt(): Date | null | undefined { return this.props.completedAt; }
  get evidenceMetadata(): Record<string, any> { return this.props.evidenceMetadata || {}; }
  get metadata(): Record<string, any> { return this.props.metadata || {}; }

  public complete(status: 'passed' | 'failed' | 'graded', score?: number, qualitativeResult?: string): void {
    this.props.status = status;
    if (score !== undefined) {
      this.props.score = score;
    }
    if (qualitativeResult !== undefined) {
      this.props.qualitativeResult = qualitativeResult;
    }
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public toJSON(): AssessmentAttemptProps {
    return { ...this.props };
  }
}
