export interface LearningReviewProps {
  id: string;
  organizationId: string;
  enrollmentId: string;
  reviewerPersonId: string;
  reviewType: string;
  reviewedAt: Date;
  summary: string;
  feedback?: string | null;
  progressValue?: number | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewChangeProps {
  id: string;
  organizationId: string;
  reviewId: string;
  changeType: string;
  targetType: string;
  targetId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class LearningReview {
  constructor(private props: LearningReviewProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get enrollmentId(): string { return this.props.enrollmentId; }
  get reviewerPersonId(): string { return this.props.reviewerPersonId; }
  get reviewType(): string { return this.props.reviewType; }
  get reviewedAt(): Date { return this.props.reviewedAt; }
  get summary(): string { return this.props.summary; }
  get feedback(): string | null | undefined { return this.props.feedback; }
  get progressValue(): number | null | undefined { return this.props.progressValue; }
  get metadata(): Record<string, any> { return this.props.metadata || {}; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  public toJSON(): LearningReviewProps {
    return { ...this.props };
  }
}
