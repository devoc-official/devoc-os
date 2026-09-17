import { getDbClient } from '../../../database/index.js';
import {
  LearningAssessment,
  LearningAssessmentProps,
  AssessmentAttempt,
  AssessmentAttemptProps,
} from '../domain/assessment.entity.js';

export class AssessmentRepository {
  // Assessments
  public async createAssessment(props: Omit<LearningAssessmentProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningAssessment> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_assessments (organization_id, enrollment_id, learning_activity_id, title, description, assessment_type, status, max_score, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [
        props.organizationId,
        props.enrollmentId,
        props.learningActivityId || null,
        props.title,
        props.description || null,
        props.assessmentType || 'practical',
        props.status || 'active',
        props.maxScore ?? null,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapAssessmentRow(res.rows[0]);
  }

  public async findAssessmentById(organizationId: string, assessmentId: string): Promise<LearningAssessment | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_assessments WHERE id = $1 AND organization_id = $2;`,
      [assessmentId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapAssessmentRow(res.rows[0]);
  }

  public async listAssessmentsByEnrollmentId(organizationId: string, enrollmentId: string): Promise<LearningAssessment[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_assessments WHERE enrollment_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [enrollmentId, organizationId]
    );
    return res.rows.map((r) => this.mapAssessmentRow(r));
  }

  public async updateAssessment(assessment: LearningAssessment): Promise<LearningAssessment> {
    const db = getDbClient();
    const res = await db.query<any>(
      `UPDATE learning_assessments
       SET title = $1, description = $2, assessment_type = $3, status = $4, max_score = $5, metadata = $6, updated_at = NOW()
       WHERE id = $7 AND organization_id = $8
       RETURNING *;`,
      [
        assessment.title,
        assessment.description,
        assessment.assessmentType,
        assessment.status,
        assessment.maxScore ?? null,
        JSON.stringify(assessment.metadata),
        assessment.id,
        assessment.organizationId,
      ]
    );
    return this.mapAssessmentRow(res.rows[0]);
  }

  // Assessment Attempts
  public async createAttempt(props: Omit<AssessmentAttemptProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssessmentAttempt> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_assessment_attempts (organization_id, assessment_id, person_id, attempt_number, status, score, qualitative_result, submitted_at, completed_at, evidence_metadata, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *;`,
      [
        props.organizationId,
        props.assessmentId,
        props.personId,
        props.attemptNumber || 1,
        props.status || 'submitted',
        props.score ?? null,
        props.qualitativeResult || null,
        props.submittedAt || new Date(),
        props.completedAt || null,
        JSON.stringify(props.evidenceMetadata || {}),
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapAttemptRow(res.rows[0]);
  }

  public async findAttemptById(organizationId: string, attemptId: string): Promise<AssessmentAttempt | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_assessment_attempts WHERE id = $1 AND organization_id = $2;`,
      [attemptId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapAttemptRow(res.rows[0]);
  }

  public async listAttemptsByAssessmentId(organizationId: string, assessmentId: string): Promise<AssessmentAttempt[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_assessment_attempts WHERE assessment_id = $1 AND organization_id = $2 ORDER BY attempt_number ASC;`,
      [assessmentId, organizationId]
    );
    return res.rows.map((r) => this.mapAttemptRow(r));
  }

  public async getNextAttemptNumber(organizationId: string, assessmentId: string, personId: string): Promise<number> {
    const db = getDbClient();
    const res = await db.query<{ max_num: number }>(
      `SELECT COALESCE(MAX(attempt_number), 0) AS max_num FROM learning_assessment_attempts
       WHERE assessment_id = $1 AND person_id = $2 AND organization_id = $3;`,
      [assessmentId, personId, organizationId]
    );
    return Number(res.rows[0]?.max_num || 0) + 1;
  }

  public async updateAttempt(attempt: AssessmentAttempt): Promise<AssessmentAttempt> {
    const db = getDbClient();
    const res = await db.query<any>(
      `UPDATE learning_assessment_attempts
       SET status = $1, score = $2, qualitative_result = $3, completed_at = $4, evidence_metadata = $5, metadata = $6, updated_at = NOW()
       WHERE id = $7 AND organization_id = $8
       RETURNING *;`,
      [
        attempt.status,
        attempt.score ?? null,
        attempt.qualitativeResult,
        attempt.completedAt || null,
        JSON.stringify(attempt.evidenceMetadata),
        JSON.stringify(attempt.metadata),
        attempt.id,
        attempt.organizationId,
      ]
    );
    return this.mapAttemptRow(res.rows[0]);
  }

  private mapAssessmentRow(row: any): LearningAssessment {
    return new LearningAssessment({
      id: row.id,
      organizationId: row.organization_id,
      enrollmentId: row.enrollment_id,
      learningActivityId: row.learning_activity_id,
      title: row.title,
      description: row.description,
      assessmentType: row.assessment_type,
      status: row.status,
      maxScore: row.max_score != null ? Number(row.max_score) : null,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private mapAttemptRow(row: any): AssessmentAttempt {
    return new AssessmentAttempt({
      id: row.id,
      organizationId: row.organization_id,
      assessmentId: row.assessment_id,
      personId: row.person_id,
      attemptNumber: row.attempt_number,
      status: row.status,
      score: row.score != null ? Number(row.score) : null,
      qualitativeResult: row.qualitative_result,
      submittedAt: new Date(row.submitted_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      evidenceMetadata: typeof row.evidence_metadata === 'string' ? JSON.parse(row.evidence_metadata) : row.evidence_metadata || {},
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
