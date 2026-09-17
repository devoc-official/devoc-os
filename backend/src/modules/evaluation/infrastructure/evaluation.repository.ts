import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import {
  Evaluation,
  EvaluationState,
  CriterionResult,
  EvaluationFeedback,
  EvaluationOutcome,
  FeedbackType,
} from '../domain/evaluation.entity.js';

export interface CreateEvaluationInput {
  templateId: string;
  subjectId: string;
  evaluatorIds?: string[];
  scheduledAt?: string;
}

export class EvaluationRepository {
  public async createEvaluation(organizationId: string, input: CreateEvaluationInput): Promise<Evaluation> {
    const db = getDbClient();

    // Verify subject person exists in tenant
    const personRes = await db.query(
      `SELECT id FROM people WHERE id = $1 AND organization_id = $2;`,
      [input.subjectId, organizationId]
    );
    if (personRes.rows.length === 0) {
      throw new NotFoundError(`Subject person '${input.subjectId}' not found in organization`);
    }

    // Verify template exists in tenant
    const templateRes = await db.query(
      `SELECT id FROM evaluation_templates WHERE id = $1 AND organization_id = $2;`,
      [input.templateId, organizationId]
    );
    if (templateRes.rows.length === 0) {
      throw new NotFoundError(`Evaluation template '${input.templateId}' not found in organization`);
    }

    const initialState: EvaluationState = input.scheduledAt ? 'Scheduled' : 'Draft';

    const res = await db.query<any>(
      `INSERT INTO evaluations (organization_id, template_id, subject_id, state, scheduled_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [organizationId, input.templateId, input.subjectId, initialState, input.scheduledAt || null]
    );

    const evalRow = res.rows[0];

    const evaluatorIds: string[] = [];
    if (input.evaluatorIds && input.evaluatorIds.length > 0) {
      for (const evId of input.evaluatorIds) {
        const evPersonRes = await db.query(
          `SELECT id FROM people WHERE id = $1 AND organization_id = $2;`,
          [evId, organizationId]
        );
        if (evPersonRes.rows.length === 0) {
          throw new NotFoundError(`Evaluator person '${evId}' not found in organization`);
        }
        await db.query(
          `INSERT INTO evaluation_evaluators (evaluation_id, evaluator_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [evalRow.id, evId]
        );
        evaluatorIds.push(evId);
      }
    }

    return this.getEvaluationById(organizationId, evalRow.id);
  }

  public async getEvaluationById(organizationId: string, evaluationId: string): Promise<Evaluation> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM evaluations WHERE id = $1 AND organization_id = $2;`,
      [evaluationId, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Evaluation '${evaluationId}' not found in organization`);
    }

    const evalRow = res.rows[0];

    const evRes = await db.query<any>(
      `SELECT evaluator_id FROM evaluation_evaluators WHERE evaluation_id = $1;`,
      [evaluationId]
    );
    const evaluatorIds = evRes.rows.map((r) => r.evaluator_id);

    const crRes = await db.query<any>(
      `SELECT * FROM criterion_results WHERE evaluation_id = $1 ORDER BY created_at ASC;`,
      [evaluationId]
    );
    const criterionResults: CriterionResult[] = crRes.rows.map((r) => ({
      id: r.id,
      evaluationId: r.evaluation_id,
      criterionId: r.criterion_id,
      value: r.value,
      comments: r.comments,
      createdAt: r.created_at,
    }));

    const fbRes = await db.query<any>(
      `SELECT * FROM evaluation_feedback WHERE evaluation_id = $1 ORDER BY created_at ASC;`,
      [evaluationId]
    );
    const feedback: EvaluationFeedback[] = fbRes.rows.map((r) => ({
      id: r.id,
      evaluationId: r.evaluation_id,
      feedbackType: r.feedback_type,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      createdAt: r.created_at,
    }));

    const outRes = await db.query<any>(
      `SELECT * FROM evaluation_outcomes WHERE evaluation_id = $1 ORDER BY created_at ASC;`,
      [evaluationId]
    );
    const outcomes: EvaluationOutcome[] = outRes.rows.map((r) => ({
      id: r.id,
      evaluationId: r.evaluation_id,
      outcomeKey: r.outcome_key,
      outcomeValue: r.outcome_value,
      createdAt: r.created_at,
    }));

    return {
      id: evalRow.id,
      organizationId: evalRow.organization_id,
      templateId: evalRow.template_id,
      subjectId: evalRow.subject_id,
      state: evalRow.state,
      scheduledAt: evalRow.scheduled_at,
      startedAt: evalRow.started_at,
      submittedAt: evalRow.submitted_at,
      completedAt: evalRow.completed_at,
      cancelledAt: evalRow.cancelled_at,
      createdAt: evalRow.created_at,
      updatedAt: evalRow.updated_at,
      evaluatorIds,
      criterionResults,
      feedback,
      outcomes,
    };
  }

  public async listEvaluations(
    organizationId: string,
    filters?: { state?: EvaluationState; subjectId?: string; evaluatorId?: string }
  ): Promise<Evaluation[]> {
    const db = getDbClient();
    let query = `SELECT DISTINCT e.* FROM evaluations e `;
    const params: any[] = [organizationId];
    let whereConditions = [`e.organization_id = $1`];

    if (filters?.evaluatorId) {
      query += `JOIN evaluation_evaluators ee ON e.id = ee.evaluation_id `;
      params.push(filters.evaluatorId);
      whereConditions.push(`ee.evaluator_id = $${params.length}`);
    }

    if (filters?.state) {
      params.push(filters.state);
      whereConditions.push(`e.state = $${params.length}`);
    }

    if (filters?.subjectId) {
      params.push(filters.subjectId);
      whereConditions.push(`e.subject_id = $${params.length}`);
    }

    query += `WHERE ` + whereConditions.join(' AND ') + ` ORDER BY e.created_at DESC;`;

    const res = await db.query<any>(query, params);

    const evaluations: Evaluation[] = [];
    for (const r of res.rows) {
      evaluations.push(await this.getEvaluationById(organizationId, r.id));
    }
    return evaluations;
  }

  public async updateEvaluationState(
    organizationId: string,
    evaluationId: string,
    targetState: EvaluationState
  ): Promise<Evaluation> {
    const db = getDbClient();
    const existing = await this.getEvaluationById(organizationId, evaluationId);

    let startedAt = existing.startedAt;
    let submittedAt = existing.submittedAt;
    let completedAt = existing.completedAt;
    let cancelledAt = existing.cancelledAt;

    const now = new Date().toISOString();
    if (targetState === 'InProgress' && !startedAt) startedAt = now;
    if (targetState === 'Submitted') submittedAt = now;
    if (targetState === 'Completed') completedAt = now;
    if (targetState === 'Cancelled') cancelledAt = now;

    await db.query(
      `UPDATE evaluations
       SET state = $1, started_at = $2, submitted_at = $3, completed_at = $4, cancelled_at = $5, updated_at = NOW()
       WHERE id = $6 AND organization_id = $7;`,
      [targetState, startedAt || null, submittedAt || null, completedAt || null, cancelledAt || null, evaluationId, organizationId]
    );

    return this.getEvaluationById(organizationId, evaluationId);
  }

  public async addOrUpdateCriterionResult(
    organizationId: string,
    evaluationId: string,
    criterionId: string,
    value: string,
    comments?: string
  ): Promise<CriterionResult> {
    const db = getDbClient();
    const existingEval = await this.getEvaluationById(organizationId, evaluationId);

    // Verify criterion belongs to evaluation's template
    const critRes = await db.query(
      `SELECT id FROM evaluation_criteria WHERE id = $1 AND template_id = $2;`,
      [criterionId, existingEval.templateId]
    );
    if (critRes.rows.length === 0) {
      throw new NotFoundError(`Criterion '${criterionId}' does not belong to evaluation template`);
    }

    const checkRes = await db.query<any>(
      `SELECT id FROM criterion_results WHERE evaluation_id = $1 AND criterion_id = $2;`,
      [evaluationId, criterionId]
    );

    let row: any;
    if (checkRes.rows.length > 0) {
      const updateRes = await db.query<any>(
        `UPDATE criterion_results SET value = $1, comments = $2 WHERE evaluation_id = $3 AND criterion_id = $4 RETURNING *;`,
        [value, comments || null, evaluationId, criterionId]
      );
      row = updateRes.rows[0];
    } else {
      const insertRes = await db.query<any>(
        `INSERT INTO criterion_results (evaluation_id, criterion_id, value, comments)
         VALUES ($1, $2, $3, $4)
         RETURNING *;`,
        [evaluationId, criterionId, value, comments || null]
      );
      row = insertRes.rows[0];
    }

    return {
      id: row.id,
      evaluationId: row.evaluation_id,
      criterionId: row.criterion_id,
      value: row.value,
      comments: row.comments,
      createdAt: row.created_at,
    };
  }

  public async addFeedback(
    organizationId: string,
    evaluationId: string,
    feedbackType: FeedbackType,
    payload: Record<string, any>
  ): Promise<EvaluationFeedback> {
    const db = getDbClient();
    await this.getEvaluationById(organizationId, evaluationId);

    const res = await db.query<any>(
      `INSERT INTO evaluation_feedback (evaluation_id, feedback_type, payload)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [evaluationId, feedbackType, JSON.stringify(payload)]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      evaluationId: row.evaluation_id,
      feedbackType: row.feedback_type,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      createdAt: row.created_at,
    };
  }

  public async saveOutcomes(
    organizationId: string,
    evaluationId: string,
    outcomes: { outcomeKey: string; outcomeValue: string }[]
  ): Promise<EvaluationOutcome[]> {
    const db = getDbClient();
    await this.getEvaluationById(organizationId, evaluationId);

    await db.query(`DELETE FROM evaluation_outcomes WHERE evaluation_id = $1;`, [evaluationId]);

    const results: EvaluationOutcome[] = [];
    for (const o of outcomes) {
      const res = await db.query<any>(
        `INSERT INTO evaluation_outcomes (evaluation_id, outcome_key, outcome_value)
         VALUES ($1, $2, $3)
         RETURNING *;`,
        [evaluationId, o.outcomeKey, o.outcomeValue]
      );
      const row = res.rows[0];
      results.push({
        id: row.id,
        evaluationId: row.evaluation_id,
        outcomeKey: row.outcome_key,
        outcomeValue: row.outcome_value,
        createdAt: row.created_at,
      });
    }

    return results;
  }

  public async createHistorySnapshot(evaluationId: string, snapshot: Record<string, any>): Promise<void> {
    const db = getDbClient();
    await db.query(
      `INSERT INTO evaluation_history (evaluation_id, snapshot) VALUES ($1, $2);`,
      [evaluationId, JSON.stringify(snapshot)]
    );
  }

  public async getHistorySnapshot(evaluationId: string): Promise<Record<string, any>> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT snapshot, captured_at FROM evaluation_history WHERE evaluation_id = $1 ORDER BY captured_at DESC LIMIT 1;`,
      [evaluationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`No historical snapshot found for evaluation '${evaluationId}'`);
    }

    const row = res.rows[0];
    return typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot;
  }
}
