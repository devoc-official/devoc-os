import { getDbClient } from '../../../database/index.js';
import {
  LearningReview,
  LearningReviewProps,
  ReviewChangeProps,
} from '../domain/learning-review.entity.js';

export class LearningReviewRepository {
  public async createReview(props: Omit<LearningReviewProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningReview> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_reviews (organization_id, enrollment_id, reviewer_person_id, review_type, reviewed_at, summary, feedback, progress_value, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [
        props.organizationId,
        props.enrollmentId,
        props.reviewerPersonId,
        props.reviewType || 'weekly',
        props.reviewedAt || new Date(),
        props.summary,
        props.feedback || null,
        props.progressValue ?? null,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapReviewRow(res.rows[0]);
  }

  public async findReviewById(organizationId: string, reviewId: string): Promise<LearningReview | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_reviews WHERE id = $1 AND organization_id = $2;`,
      [reviewId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapReviewRow(res.rows[0]);
  }

  public async listReviewsByEnrollmentId(organizationId: string, enrollmentId: string): Promise<LearningReview[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_reviews
       WHERE enrollment_id = $1 AND organization_id = $2
       ORDER BY reviewed_at DESC, created_at DESC;`,
      [enrollmentId, organizationId]
    );
    return res.rows.map((r) => this.mapReviewRow(r));
  }

  // Review Changes
  public async createReviewChange(props: Omit<ReviewChangeProps, 'id' | 'createdAt'>): Promise<ReviewChangeProps> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_review_changes (organization_id, review_id, change_type, target_type, target_id, previous_value, new_value, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [
        props.organizationId,
        props.reviewId,
        props.changeType,
        props.targetType,
        props.targetId,
        props.previousValue ? JSON.stringify(props.previousValue) : null,
        props.newValue ? JSON.stringify(props.newValue) : null,
        props.reason || null,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapChangeRow(res.rows[0]);
  }

  public async listReviewChangesByReviewId(organizationId: string, reviewId: string): Promise<ReviewChangeProps[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_review_changes WHERE review_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [reviewId, organizationId]
    );
    return res.rows.map((r) => this.mapChangeRow(r));
  }

  private mapReviewRow(row: any): LearningReview {
    return new LearningReview({
      id: row.id,
      organizationId: row.organization_id,
      enrollmentId: row.enrollment_id,
      reviewerPersonId: row.reviewer_person_id,
      reviewType: row.review_type,
      reviewedAt: new Date(row.reviewed_at),
      summary: row.summary,
      feedback: row.feedback,
      progressValue: row.progress_value != null ? Number(row.progress_value) : null,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private mapChangeRow(row: any): ReviewChangeProps {
    return {
      id: row.id,
      organizationId: row.organization_id,
      reviewId: row.review_id,
      changeType: row.change_type,
      targetType: row.target_type,
      targetId: row.target_id,
      previousValue: typeof row.previous_value === 'string' ? JSON.parse(row.previous_value) : row.previous_value,
      newValue: typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value,
      reason: row.reason,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
    };
  }
}
