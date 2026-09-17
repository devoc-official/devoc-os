import { getDbClient } from '../../../database/index.js';
import {
  LearningEnrollment,
  LearningEnrollmentProps,
  EnrollmentMilestone,
  EnrollmentMilestoneProps,
  LearningActivity,
  LearningActivityProps,
  LearningActivityReferenceProps,
} from '../domain/enrollment.entity.js';

export class EnrollmentRepository {
  // Enrollments
  public async createEnrollment(props: Omit<LearningEnrollmentProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningEnrollment> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_enrollments (organization_id, person_id, learning_program_id, status, enrolled_at, started_at, expected_end_at, completed_at, withdrawn_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *;`,
      [
        props.organizationId,
        props.personId,
        props.learningProgramId,
        props.status || 'pending',
        props.enrolledAt || new Date(),
        props.startedAt || null,
        props.expectedEndAt || null,
        props.completedAt || null,
        props.withdrawnAt || null,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapEnrollmentRow(res.rows[0]);
  }

  public async findEnrollmentById(organizationId: string, enrollmentId: string): Promise<LearningEnrollment | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_enrollments WHERE id = $1 AND organization_id = $2;`,
      [enrollmentId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapEnrollmentRow(res.rows[0]);
  }

  public async listEnrollments(organizationId: string, filters?: { personId?: string; programId?: string; status?: string }): Promise<LearningEnrollment[]> {
    const db = getDbClient();
    let query = `SELECT * FROM learning_enrollments WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (filters?.personId) {
      params.push(filters.personId);
      query += ` AND person_id = $${params.length}`;
    }
    if (filters?.programId) {
      params.push(filters.programId);
      query += ` AND learning_program_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    query += ` ORDER BY created_at DESC;`;

    const res = await db.query<any>(query, params);
    return res.rows.map((r) => this.mapEnrollmentRow(r));
  }

  public async updateEnrollment(enrollment: LearningEnrollment): Promise<LearningEnrollment> {
    const db = getDbClient();
    const res = await db.query<any>(
      `UPDATE learning_enrollments
       SET status = $1, started_at = $2, expected_end_at = $3, completed_at = $4, withdrawn_at = $5, metadata = $6, updated_at = NOW()
       WHERE id = $7 AND organization_id = $8
       RETURNING *;`,
      [
        enrollment.status,
        enrollment.startedAt || null,
        enrollment.expectedEndAt || null,
        enrollment.completedAt || null,
        enrollment.withdrawnAt || null,
        JSON.stringify(enrollment.metadata),
        enrollment.id,
        enrollment.organizationId,
      ]
    );
    return this.mapEnrollmentRow(res.rows[0]);
  }

  // Enrollment Milestones
  public async createEnrollmentMilestone(props: Omit<EnrollmentMilestoneProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<EnrollmentMilestone> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO enrollment_milestones (organization_id, enrollment_id, source_milestone_id, title, description, sequence, status, started_at, completed_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *;`,
      [
        props.organizationId,
        props.enrollmentId,
        props.sourceMilestoneId || null,
        props.title,
        props.description || null,
        props.sequence || 1,
        props.status || 'pending',
        props.startedAt || null,
        props.completedAt || null,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapMilestoneRow(res.rows[0]);
  }

  public async listEnrollmentMilestones(organizationId: string, enrollmentId: string): Promise<EnrollmentMilestone[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM enrollment_milestones
       WHERE enrollment_id = $1 AND organization_id = $2
       ORDER BY sequence ASC, created_at ASC;`,
      [enrollmentId, organizationId]
    );
    return res.rows.map((r) => this.mapMilestoneRow(r));
  }

  public async findEnrollmentMilestoneById(organizationId: string, milestoneId: string): Promise<EnrollmentMilestone | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM enrollment_milestones WHERE id = $1 AND organization_id = $2;`,
      [milestoneId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapMilestoneRow(res.rows[0]);
  }

  public async updateEnrollmentMilestone(milestone: EnrollmentMilestone): Promise<EnrollmentMilestone> {
    const db = getDbClient();
    const res = await db.query<any>(
      `UPDATE enrollment_milestones
       SET title = $1, description = $2, sequence = $3, status = $4, started_at = $5, completed_at = $6, metadata = $7, updated_at = NOW()
       WHERE id = $8 AND organization_id = $9
       RETURNING *;`,
      [
        milestone.title,
        milestone.description,
        milestone.sequence,
        milestone.status,
        milestone.startedAt || null,
        milestone.completedAt || null,
        JSON.stringify(milestone.metadata),
        milestone.id,
        milestone.organizationId,
      ]
    );
    return this.mapMilestoneRow(res.rows[0]);
  }

  // Learning Activities
  public async createLearningActivity(props: Omit<LearningActivityProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningActivity> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_activities (organization_id, enrollment_milestone_id, source_activity_id, title, description, activity_type, sequence, status, started_at, completed_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *;`,
      [
        props.organizationId,
        props.enrollmentMilestoneId,
        props.sourceActivityId || null,
        props.title,
        props.description || null,
        props.activityType,
        props.sequence || 1,
        props.status || 'pending',
        props.startedAt || null,
        props.completedAt || null,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapActivityRow(res.rows[0]);
  }

  public async listLearningActivities(organizationId: string, enrollmentMilestoneId: string): Promise<LearningActivity[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_activities
       WHERE enrollment_milestone_id = $1 AND organization_id = $2
       ORDER BY sequence ASC, created_at ASC;`,
      [enrollmentMilestoneId, organizationId]
    );
    return res.rows.map((r) => this.mapActivityRow(r));
  }

  public async listActivitiesByEnrollmentId(organizationId: string, enrollmentId: string): Promise<LearningActivity[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT la.* FROM learning_activities la
       JOIN enrollment_milestones em ON la.enrollment_milestone_id = em.id
       WHERE em.enrollment_id = $1 AND la.organization_id = $2
       ORDER BY em.sequence ASC, la.sequence ASC;`,
      [enrollmentId, organizationId]
    );
    return res.rows.map((r) => this.mapActivityRow(r));
  }

  public async findLearningActivityById(organizationId: string, activityId: string): Promise<LearningActivity | null> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_activities WHERE id = $1 AND organization_id = $2;`,
      [activityId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapActivityRow(res.rows[0]);
  }

  public async updateLearningActivity(activity: LearningActivity): Promise<LearningActivity> {
    const db = getDbClient();
    const res = await db.query<any>(
      `UPDATE learning_activities
       SET title = $1, description = $2, activity_type = $3, sequence = $4, status = $5, started_at = $6, completed_at = $7, metadata = $8, updated_at = NOW()
       WHERE id = $9 AND organization_id = $10
       RETURNING *;`,
      [
        activity.title,
        activity.description,
        activity.activityType,
        activity.sequence,
        activity.status,
        activity.startedAt || null,
        activity.completedAt || null,
        JSON.stringify(activity.metadata),
        activity.id,
        activity.organizationId,
      ]
    );
    return this.mapActivityRow(res.rows[0]);
  }

  // Learning Activity References
  public async createActivityReference(props: Omit<LearningActivityReferenceProps, 'id' | 'createdAt'>): Promise<LearningActivityReferenceProps> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO learning_activity_references (organization_id, learning_activity_id, reference_type, reference_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [
        props.organizationId,
        props.learningActivityId,
        props.referenceType,
        props.referenceId,
        JSON.stringify(props.metadata || {}),
      ]
    );
    return this.mapRefRow(res.rows[0]);
  }

  public async listActivityReferences(organizationId: string, activityId: string): Promise<LearningActivityReferenceProps[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM learning_activity_references WHERE learning_activity_id = $1 AND organization_id = $2;`,
      [activityId, organizationId]
    );
    return res.rows.map((r) => this.mapRefRow(r));
  }

  private mapEnrollmentRow(row: any): LearningEnrollment {
    return new LearningEnrollment({
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      learningProgramId: row.learning_program_id,
      status: row.status,
      enrolledAt: new Date(row.enrolled_at),
      startedAt: row.started_at ? new Date(row.started_at) : null,
      expectedEndAt: row.expected_end_at ? new Date(row.expected_end_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      withdrawnAt: row.withdrawn_at ? new Date(row.withdrawn_at) : null,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private mapMilestoneRow(row: any): EnrollmentMilestone {
    return new EnrollmentMilestone({
      id: row.id,
      organizationId: row.organization_id,
      enrollmentId: row.enrollment_id,
      sourceMilestoneId: row.source_milestone_id,
      title: row.title,
      description: row.description,
      sequence: row.sequence,
      status: row.status,
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private mapActivityRow(row: any): LearningActivity {
    return new LearningActivity({
      id: row.id,
      organizationId: row.organization_id,
      enrollmentMilestoneId: row.enrollment_milestone_id,
      sourceActivityId: row.source_activity_id,
      title: row.title,
      description: row.description,
      activityType: row.activity_type,
      sequence: row.sequence,
      status: row.status,
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private mapRefRow(row: any): LearningActivityReferenceProps {
    return {
      id: row.id,
      organizationId: row.organization_id,
      learningActivityId: row.learning_activity_id,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
    };
  }
}
