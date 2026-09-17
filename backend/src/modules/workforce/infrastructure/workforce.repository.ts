import { DbClient, getDbClient } from '../../../database/index.js';
import {
  OnboardingTemplate,
  OnboardingTemplateTask,
  OnboardingTemplateItem,
  OnboardingPlan,
  OnboardingTask,
  OnboardingItem,
  WorkforceTransfer,
  WorkforcePromotion,
  WorkforceOffboarding,
  WorkforceOffboardingClearance,
  OnboardingPlanStatus,
  OnboardingTaskStatus,
  OnboardingItemStatus,
  MovementStatus,
  OffboardingStatus,
  ClearanceStatus,
  ExitReason,
  OnboardingItemType,
  ClearanceType,
} from '../domain/workforce.types.js';

export class WorkforceRepository {
  private getClient(client?: DbClient): DbClient {
    return client || getDbClient();
  }

  // --- TEMPLATES ---
  public async createTemplate(
    data: {
      organizationId: string;
      name: string;
      code: string;
      description?: string | null;
      isDefault?: boolean;
      isActive?: boolean;
    },
    tx?: DbClient
  ): Promise<OnboardingTemplate> {
    const db = this.getClient(tx);
    const res = await db.query(
      `INSERT INTO workforce_onboarding_templates (organization_id, name, code, description, is_default, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [
        data.organizationId,
        data.name,
        data.code,
        data.description || null,
        data.isDefault ?? false,
        data.isActive ?? true,
      ]
    );
    return this.mapTemplate(res.rows[0]);
  }

  public async findTemplateById(organizationId: string, templateId: string, tx?: DbClient): Promise<OnboardingTemplate | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_templates WHERE id = $1 AND organization_id = $2;`,
      [templateId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapTemplate(res.rows[0]);
  }

  public async findDefaultTemplate(organizationId: string, tx?: DbClient): Promise<OnboardingTemplate | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_templates WHERE organization_id = $1 AND is_default = TRUE AND is_active = TRUE LIMIT 1;`,
      [organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapTemplate(res.rows[0]);
  }

  public async listTemplates(organizationId: string, tx?: DbClient): Promise<OnboardingTemplate[]> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_templates WHERE organization_id = $1 ORDER BY name ASC;`,
      [organizationId]
    );
    return res.rows.map((r) => this.mapTemplate(r));
  }

  public async updateTemplate(
    organizationId: string,
    templateId: string,
    data: { name?: string; description?: string | null; isDefault?: boolean; isActive?: boolean },
    tx?: DbClient
  ): Promise<OnboardingTemplate | null> {
    const db = this.getClient(tx);
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [templateId, organizationId];

    if (data.name !== undefined) {
      params.push(data.name);
      sets.push(`name = $${params.length}`);
    }
    if (data.description !== undefined) {
      params.push(data.description);
      sets.push(`description = $${params.length}`);
    }
    if (data.isDefault !== undefined) {
      params.push(data.isDefault);
      sets.push(`is_default = $${params.length}`);
    }
    if (data.isActive !== undefined) {
      params.push(data.isActive);
      sets.push(`is_active = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE workforce_onboarding_templates SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *;`,
      params
    );
    if (res.rows.length === 0) return null;
    return this.mapTemplate(res.rows[0]);
  }

  // --- TEMPLATE TASKS ---
  public async createTemplateTask(
    data: {
      organizationId: string;
      templateId: string;
      title: string;
      description?: string | null;
      assignedRoleContext?: string | null;
      dueOffsetDays?: number;
      isMandatory?: boolean;
      displayOrder?: number;
    },
    tx?: DbClient
  ): Promise<OnboardingTemplateTask> {
    const db = this.getClient(tx);
    const res = await db.query(
      `INSERT INTO workforce_onboarding_template_tasks (organization_id, template_id, title, description, assigned_role_context, due_offset_days, is_mandatory, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        data.organizationId,
        data.templateId,
        data.title,
        data.description || null,
        data.assignedRoleContext || null,
        data.dueOffsetDays ?? 7,
        data.isMandatory ?? true,
        data.displayOrder ?? 0,
      ]
    );
    return this.mapTemplateTask(res.rows[0]);
  }

  public async listTemplateTasks(organizationId: string, templateId: string, tx?: DbClient): Promise<OnboardingTemplateTask[]> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_template_tasks WHERE template_id = $1 AND organization_id = $2 ORDER BY display_order ASC;`,
      [templateId, organizationId]
    );
    return res.rows.map((r) => this.mapTemplateTask(r));
  }

  // --- TEMPLATE ITEMS ---
  public async createTemplateItem(
    data: {
      organizationId: string;
      templateId: string;
      templateTaskId?: string | null;
      itemType: OnboardingItemType;
      title: string;
      description?: string | null;
      isRequired?: boolean;
      sequenceOrder?: number;
    },
    tx?: DbClient
  ): Promise<OnboardingTemplateItem> {
    const db = this.getClient(tx);
    const res = await db.query(
      `INSERT INTO workforce_onboarding_template_items (organization_id, template_id, template_task_id, item_type, title, description, is_required, sequence_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        data.organizationId,
        data.templateId,
        data.templateTaskId || null,
        data.itemType,
        data.title,
        data.description || null,
        data.isRequired ?? true,
        data.sequenceOrder ?? 0,
      ]
    );
    return this.mapTemplateItem(res.rows[0]);
  }

  public async listTemplateItems(organizationId: string, templateId: string, tx?: DbClient): Promise<OnboardingTemplateItem[]> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_template_items WHERE template_id = $1 AND organization_id = $2 ORDER BY sequence_order ASC;`,
      [templateId, organizationId]
    );
    return res.rows.map((r) => this.mapTemplateItem(r));
  }

  // --- ONBOARDING PLANS ---
  public async createPlan(
    data: {
      organizationId: string;
      employmentId: string;
      personId: string;
      templateId?: string | null;
      status?: OnboardingPlanStatus;
      initiatedAt?: Date | null;
      targetCompletionDate?: Date | null;
      notes?: string | null;
    },
    tx?: DbClient
  ): Promise<OnboardingPlan> {
    const db = this.getClient(tx);
    const res = await db.query(
      `INSERT INTO workforce_onboarding_plans (organization_id, employment_id, person_id, template_id, status, initiated_at, target_completion_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        data.organizationId,
        data.employmentId,
        data.personId,
        data.templateId || null,
        data.status || 'draft',
        data.initiatedAt || (data.status === 'initiated' ? new Date() : null),
        data.targetCompletionDate || null,
        data.notes || null,
      ]
    );
    return this.mapPlan(res.rows[0]);
  }

  public async findPlanById(organizationId: string, planId: string, tx?: DbClient): Promise<OnboardingPlan | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_plans WHERE id = $1 AND organization_id = $2;`,
      [planId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapPlan(res.rows[0]);
  }

  public async findPlanByEmployment(organizationId: string, employmentId: string, tx?: DbClient): Promise<OnboardingPlan | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_plans WHERE employment_id = $1 AND organization_id = $2;`,
      [employmentId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapPlan(res.rows[0]);
  }

  public async listPlans(organizationId: string, filters?: { status?: OnboardingPlanStatus; personId?: string }, tx?: DbClient): Promise<OnboardingPlan[]> {
    const db = this.getClient(tx);
    let query = `SELECT * FROM workforce_onboarding_plans WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    if (filters?.personId) {
      params.push(filters.personId);
      query += ` AND person_id = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows.map((r) => this.mapPlan(r));
  }

  public async updatePlanStatus(
    organizationId: string,
    planId: string,
    status: OnboardingPlanStatus,
    actualCompletionDate?: Date | null,
    tx?: DbClient
  ): Promise<OnboardingPlan | null> {
    const db = this.getClient(tx);
    const sets = ['status = $3', 'updated_at = NOW()'];
    const params: unknown[] = [planId, organizationId, status];

    if (status === 'initiated') {
      sets.push('initiated_at = NOW()');
    }
    if (actualCompletionDate !== undefined) {
      params.push(actualCompletionDate);
      sets.push(`actual_completion_date = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE workforce_onboarding_plans SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *;`,
      params
    );
    if (res.rows.length === 0) return null;
    return this.mapPlan(res.rows[0]);
  }

  // --- ONBOARDING TASKS ---
  public async createTask(
    data: {
      organizationId: string;
      planId: string;
      templateTaskId?: string | null;
      title: string;
      description?: string | null;
      assignedRoleContext?: string | null;
      status?: OnboardingTaskStatus;
      isMandatory?: boolean;
      displayOrder?: number;
      dueDate?: Date | null;
      meetingId?: string | null;
      learningProgramId?: string | null;
      evaluationId?: string | null;
    },
    tx?: DbClient
  ): Promise<OnboardingTask> {
    const db = this.getClient(tx);
    const res = await db.query(
      `INSERT INTO workforce_onboarding_tasks (
        organization_id, plan_id, template_task_id, title, description,
        assigned_role_context, status, is_mandatory, display_order, due_date,
        meeting_id, learning_program_id, evaluation_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;`,
      [
        data.organizationId,
        data.planId,
        data.templateTaskId || null,
        data.title,
        data.description || null,
        data.assignedRoleContext || null,
        data.status || 'pending',
        data.isMandatory ?? true,
        data.displayOrder ?? 0,
        data.dueDate || null,
        data.meetingId || null,
        data.learningProgramId || null,
        data.evaluationId || null,
      ]
    );
    return this.mapTask(res.rows[0]);
  }

  public async findTaskById(organizationId: string, taskId: string, tx?: DbClient): Promise<OnboardingTask | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_tasks WHERE id = $1 AND organization_id = $2;`,
      [taskId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapTask(res.rows[0]);
  }

  public async listTasksByPlan(organizationId: string, planId: string, tx?: DbClient): Promise<OnboardingTask[]> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_tasks WHERE plan_id = $1 AND organization_id = $2 ORDER BY display_order ASC;`,
      [planId, organizationId]
    );
    return res.rows.map((r) => this.mapTask(r));
  }

  public async updateTask(
    organizationId: string,
    taskId: string,
    updates: {
      status?: OnboardingTaskStatus;
      completedAt?: Date | null;
      description?: string | null;
      dueDate?: Date | null;
    },
    tx?: DbClient
  ): Promise<OnboardingTask | null> {
    const db = this.getClient(tx);
    const sets = ['updated_at = NOW()'];
    const params: unknown[] = [taskId, organizationId];

    if (updates.status !== undefined) {
      params.push(updates.status);
      sets.push(`status = $${params.length}`);
    }
    if (updates.completedAt !== undefined) {
      params.push(updates.completedAt);
      sets.push(`completed_at = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      sets.push(`description = $${params.length}`);
    }
    if (updates.dueDate !== undefined) {
      params.push(updates.dueDate);
      sets.push(`due_date = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE workforce_onboarding_tasks SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *;`,
      params
    );
    if (res.rows.length === 0) return null;
    return this.mapTask(res.rows[0]);
  }

  // --- ONBOARDING ITEMS ---
  public async createItem(
    data: {
      organizationId: string;
      planId: string;
      taskId?: string | null;
      templateItemId?: string | null;
      itemType: OnboardingItemType;
      title: string;
      status?: OnboardingItemStatus;
      itemMetadata?: Record<string, unknown>;
    },
    tx?: DbClient
  ): Promise<OnboardingItem> {
    const db = this.getClient(tx);
    const res = await db.query(
      `INSERT INTO workforce_onboarding_items (
        organization_id, plan_id, task_id, template_item_id, item_type, title, status, item_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`,
      [
        data.organizationId,
        data.planId,
        data.taskId || null,
        data.templateItemId || null,
        data.itemType,
        data.title,
        data.status || 'pending',
        JSON.stringify(data.itemMetadata || {}),
      ]
    );
    return this.mapItem(res.rows[0]);
  }

  public async findItemById(organizationId: string, itemId: string, tx?: DbClient): Promise<OnboardingItem | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_items WHERE id = $1 AND organization_id = $2;`,
      [itemId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapItem(res.rows[0]);
  }

  public async listItemsByPlan(organizationId: string, planId: string, tx?: DbClient): Promise<OnboardingItem[]> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_onboarding_items WHERE plan_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [planId, organizationId]
    );
    return res.rows.map((r) => this.mapItem(r));
  }

  public async updateItem(
    organizationId: string,
    itemId: string,
    updates: {
      status?: OnboardingItemStatus;
      itemMetadata?: Record<string, unknown>;
      verifiedByPersonId?: string | null;
      verifiedAt?: Date | null;
    },
    tx?: DbClient
  ): Promise<OnboardingItem | null> {
    const db = this.getClient(tx);
    const sets = ['updated_at = NOW()'];
    const params: unknown[] = [itemId, organizationId];

    if (updates.status !== undefined) {
      params.push(updates.status);
      sets.push(`status = $${params.length}`);
    }
    if (updates.itemMetadata !== undefined) {
      params.push(JSON.stringify(updates.itemMetadata));
      sets.push(`item_metadata = $${params.length}`);
    }
    if (updates.verifiedByPersonId !== undefined) {
      params.push(updates.verifiedByPersonId);
      sets.push(`verified_by_person_id = $${params.length}`);
    }
    if (updates.verifiedAt !== undefined) {
      params.push(updates.verifiedAt);
      sets.push(`verified_at = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE workforce_onboarding_items SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *;`,
      params
    );
    if (res.rows.length === 0) return null;
    return this.mapItem(res.rows[0]);
  }

  // --- TRANSFERS ---
  public async createTransfer(
    data: {
      organizationId: string;
      employmentId: string;
      personId: string;
      sourceBusinessUnitId?: string | null;
      targetBusinessUnitId?: string | null;
      sourceDepartmentId?: string | null;
      targetDepartmentId?: string | null;
      sourceTeamId?: string | null;
      targetTeamId?: string | null;
      sourceManagerId?: string | null;
      targetManagerId?: string | null;
      status?: MovementStatus;
      reason?: string | null;
      effectiveDate: Date;
    },
    tx?: DbClient
  ): Promise<WorkforceTransfer> {
    const db = this.getClient(tx);
    const res = await db.query(
      `INSERT INTO workforce_transfers (
        organization_id, employment_id, person_id,
        source_business_unit_id, target_business_unit_id,
        source_department_id, target_department_id,
        source_team_id, target_team_id,
        source_manager_id, target_manager_id,
        status, reason, effective_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;`,
      [
        data.organizationId,
        data.employmentId,
        data.personId,
        data.sourceBusinessUnitId || null,
        data.targetBusinessUnitId || null,
        data.sourceDepartmentId || null,
        data.targetDepartmentId || null,
        data.sourceTeamId || null,
        data.targetTeamId || null,
        data.sourceManagerId || null,
        data.targetManagerId || null,
        data.status || 'draft',
        data.reason || null,
        data.effectiveDate,
      ]
    );
    return this.mapTransfer(res.rows[0]);
  }

  public async findTransferById(organizationId: string, transferId: string, tx?: DbClient): Promise<WorkforceTransfer | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_transfers WHERE id = $1 AND organization_id = $2;`,
      [transferId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapTransfer(res.rows[0]);
  }

  public async listTransfers(organizationId: string, filters?: { employmentId?: string; status?: MovementStatus }, tx?: DbClient): Promise<WorkforceTransfer[]> {
    const db = this.getClient(tx);
    let query = `SELECT * FROM workforce_transfers WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (filters?.employmentId) {
      params.push(filters.employmentId);
      query += ` AND employment_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows.map((r) => this.mapTransfer(r));
  }

  public async updateTransferStatus(
    organizationId: string,
    transferId: string,
    status: MovementStatus,
    extra?: {
      submittedAt?: Date | null;
      reviewedAt?: Date | null;
      approvedAt?: Date | null;
      approvedByPersonId?: string | null;
      executedAt?: Date | null;
    },
    tx?: DbClient
  ): Promise<WorkforceTransfer | null> {
    const db = this.getClient(tx);
    const sets = ['status = $3', 'updated_at = NOW()'];
    const params: unknown[] = [transferId, organizationId, status];

    if (extra?.submittedAt !== undefined) {
      params.push(extra.submittedAt);
      sets.push(`submitted_at = $${params.length}`);
    }
    if (extra?.reviewedAt !== undefined) {
      params.push(extra.reviewedAt);
      sets.push(`reviewed_at = $${params.length}`);
    }
    if (extra?.approvedAt !== undefined) {
      params.push(extra.approvedAt);
      sets.push(`approved_at = $${params.length}`);
    }
    if (extra?.approvedByPersonId !== undefined) {
      params.push(extra.approvedByPersonId);
      sets.push(`approved_by_person_id = $${params.length}`);
    }
    if (extra?.executedAt !== undefined) {
      params.push(extra.executedAt);
      sets.push(`executed_at = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE workforce_transfers SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *;`,
      params
    );
    if (res.rows.length === 0) return null;
    return this.mapTransfer(res.rows[0]);
  }

  // --- PROMOTIONS ---
  public async createPromotion(
    data: {
      organizationId: string;
      employmentId: string;
      personId: string;
      sourceJobTitle: string;
      targetJobTitle: string;
      sourcePersonRoleId?: string | null;
      targetPersonRoleId?: string | null;
      status?: MovementStatus;
      reason?: string | null;
      effectiveDate: Date;
    },
    tx?: DbClient
  ): Promise<WorkforcePromotion> {
    const db = this.getClient(tx);
    const res = await db.query(
      `INSERT INTO workforce_promotions (
        organization_id, employment_id, person_id,
        source_job_title, target_job_title,
        source_person_role_id, target_person_role_id,
        status, reason, effective_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;`,
      [
        data.organizationId,
        data.employmentId,
        data.personId,
        data.sourceJobTitle,
        data.targetJobTitle,
        data.sourcePersonRoleId || null,
        data.targetPersonRoleId || null,
        data.status || 'draft',
        data.reason || null,
        data.effectiveDate,
      ]
    );
    return this.mapPromotion(res.rows[0]);
  }

  public async findPromotionById(organizationId: string, promotionId: string, tx?: DbClient): Promise<WorkforcePromotion | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_promotions WHERE id = $1 AND organization_id = $2;`,
      [promotionId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapPromotion(res.rows[0]);
  }

  public async listPromotions(organizationId: string, filters?: { employmentId?: string; status?: MovementStatus }, tx?: DbClient): Promise<WorkforcePromotion[]> {
    const db = this.getClient(tx);
    let query = `SELECT * FROM workforce_promotions WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (filters?.employmentId) {
      params.push(filters.employmentId);
      query += ` AND employment_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows.map((r) => this.mapPromotion(r));
  }

  public async updatePromotionStatus(
    organizationId: string,
    promotionId: string,
    status: MovementStatus,
    extra?: {
      submittedAt?: Date | null;
      reviewedAt?: Date | null;
      approvedAt?: Date | null;
      approvedByPersonId?: string | null;
      executedAt?: Date | null;
    },
    tx?: DbClient
  ): Promise<WorkforcePromotion | null> {
    const db = this.getClient(tx);
    const sets = ['status = $3', 'updated_at = NOW()'];
    const params: unknown[] = [promotionId, organizationId, status];

    if (extra?.submittedAt !== undefined) {
      params.push(extra.submittedAt);
      sets.push(`submitted_at = $${params.length}`);
    }
    if (extra?.reviewedAt !== undefined) {
      params.push(extra.reviewedAt);
      sets.push(`reviewed_at = $${params.length}`);
    }
    if (extra?.approvedAt !== undefined) {
      params.push(extra.approvedAt);
      sets.push(`approved_at = $${params.length}`);
    }
    if (extra?.approvedByPersonId !== undefined) {
      params.push(extra.approvedByPersonId);
      sets.push(`approved_by_person_id = $${params.length}`);
    }
    if (extra?.executedAt !== undefined) {
      params.push(extra.executedAt);
      sets.push(`executed_at = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE workforce_promotions SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *;`,
      params
    );
    if (res.rows.length === 0) return null;
    return this.mapPromotion(res.rows[0]);
  }

  // --- OFFBOARDING ---
  public async createOffboarding(
    data: {
      organizationId: string;
      employmentId: string;
      personId: string;
      exitReason: ExitReason;
      status?: OffboardingStatus;
      exitDate: Date;
      notes?: string | null;
    },
    tx?: DbClient
  ): Promise<WorkforceOffboarding> {
    const db = this.getClient(tx);
    const res = await db.query(
      `INSERT INTO workforce_offboardings (organization_id, employment_id, person_id, exit_reason, status, exit_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [
        data.organizationId,
        data.employmentId,
        data.personId,
        data.exitReason,
        data.status || 'initiated',
        data.exitDate,
        data.notes || null,
      ]
    );
    return this.mapOffboarding(res.rows[0]);
  }

  public async findOffboardingById(organizationId: string, offboardingId: string, tx?: DbClient): Promise<WorkforceOffboarding | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_offboardings WHERE id = $1 AND organization_id = $2;`,
      [offboardingId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapOffboarding(res.rows[0]);
  }

  public async findOffboardingByEmployment(organizationId: string, employmentId: string, tx?: DbClient): Promise<WorkforceOffboarding | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_offboardings WHERE employment_id = $1 AND organization_id = $2;`,
      [employmentId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapOffboarding(res.rows[0]);
  }

  public async listOffboardings(organizationId: string, filters?: { status?: OffboardingStatus }, tx?: DbClient): Promise<WorkforceOffboarding[]> {
    const db = this.getClient(tx);
    let query = `SELECT * FROM workforce_offboardings WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows.map((r) => this.mapOffboarding(r));
  }

  public async updateOffboardingStatus(
    organizationId: string,
    offboardingId: string,
    status: OffboardingStatus,
    completedAt?: Date | null,
    notes?: string | null,
    tx?: DbClient
  ): Promise<WorkforceOffboarding | null> {
    const db = this.getClient(tx);
    const sets = ['status = $3', 'updated_at = NOW()'];
    const params: unknown[] = [offboardingId, organizationId, status];

    if (completedAt !== undefined) {
      params.push(completedAt);
      sets.push(`completed_at = $${params.length}`);
    }
    if (notes !== undefined) {
      params.push(notes);
      sets.push(`notes = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE workforce_offboardings SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *;`,
      params
    );
    if (res.rows.length === 0) return null;
    return this.mapOffboarding(res.rows[0]);
  }

  // --- OFFBOARDING CLEARANCES ---
  public async createClearance(
    data: {
      organizationId: string;
      offboardingId: string;
      clearanceType: ClearanceType;
      departmentId?: string | null;
      verifierPersonId?: string | null;
      financialObligationId?: string | null;
      status?: ClearanceStatus;
      notes?: string | null;
    },
    tx?: DbClient
  ): Promise<WorkforceOffboardingClearance> {
    const db = this.getClient(tx);

    // Validate financialObligationId tenant scoping if provided
    if (data.financialObligationId) {
      const finCheck = await db.query(
        `SELECT id FROM finance_obligations WHERE id = $1 AND organization_id = $2;`,
        [data.financialObligationId, data.organizationId]
      );
      if (finCheck.rows.length === 0) {
        throw new Error(`Financial obligation '${data.financialObligationId}' not found in organization`);
      }
    }

    const res = await db.query(
      `INSERT INTO workforce_offboarding_clearances (
        organization_id, offboarding_id, clearance_type, department_id,
        verifier_person_id, financial_obligation_id, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`,
      [
        data.organizationId,
        data.offboardingId,
        data.clearanceType,
        data.departmentId || null,
        data.verifierPersonId || null,
        data.financialObligationId || null,
        data.status || 'pending',
        data.notes || null,
      ]
    );
    return this.mapClearance(res.rows[0]);
  }

  public async findClearanceById(organizationId: string, clearanceId: string, tx?: DbClient): Promise<WorkforceOffboardingClearance | null> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_offboarding_clearances WHERE id = $1 AND organization_id = $2;`,
      [clearanceId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapClearance(res.rows[0]);
  }

  public async listClearancesByOffboarding(organizationId: string, offboardingId: string, tx?: DbClient): Promise<WorkforceOffboardingClearance[]> {
    const db = this.getClient(tx);
    const res = await db.query(
      `SELECT * FROM workforce_offboarding_clearances WHERE offboarding_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [offboardingId, organizationId]
    );
    return res.rows.map((r) => this.mapClearance(r));
  }

  public async updateClearanceStatus(
    organizationId: string,
    clearanceId: string,
    status: ClearanceStatus,
    verifierPersonId?: string | null,
    notes?: string | null,
    tx?: DbClient
  ): Promise<WorkforceOffboardingClearance | null> {
    const db = this.getClient(tx);
    const sets = ['status = $3', 'updated_at = NOW()'];
    const params: unknown[] = [clearanceId, organizationId, status];

    if (status === 'cleared') {
      sets.push('cleared_at = NOW()');
    }
    if (verifierPersonId !== undefined) {
      params.push(verifierPersonId);
      sets.push(`verifier_person_id = $${params.length}`);
    }
    if (notes !== undefined) {
      params.push(notes);
      sets.push(`notes = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE workforce_offboarding_clearances SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *;`,
      params
    );
    if (res.rows.length === 0) return null;
    return this.mapClearance(res.rows[0]);
  }

  // --- MAPPING HELPERS ---
  private mapTemplate(row: any): OnboardingTemplate {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      description: row.description,
      isDefault: row.is_default,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapTemplateTask(row: any): OnboardingTemplateTask {
    return {
      id: row.id,
      organizationId: row.organization_id,
      templateId: row.template_id,
      title: row.title,
      description: row.description,
      assignedRoleContext: row.assigned_role_context,
      dueOffsetDays: row.due_offset_days,
      isMandatory: row.is_mandatory,
      displayOrder: row.display_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapTemplateItem(row: any): OnboardingTemplateItem {
    return {
      id: row.id,
      organizationId: row.organization_id,
      templateId: row.template_id,
      templateTaskId: row.template_task_id,
      itemType: row.item_type,
      title: row.title,
      description: row.description,
      isRequired: row.is_required,
      sequenceOrder: row.sequence_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapPlan(row: any): OnboardingPlan {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      templateId: row.template_id,
      status: row.status,
      initiatedAt: row.initiated_at ? new Date(row.initiated_at) : null,
      targetCompletionDate: row.target_completion_date ? new Date(row.target_completion_date) : null,
      actualCompletionDate: row.actual_completion_date ? new Date(row.actual_completion_date) : null,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapTask(row: any): OnboardingTask {
    return {
      id: row.id,
      organizationId: row.organization_id,
      planId: row.plan_id,
      templateTaskId: row.template_task_id,
      title: row.title,
      description: row.description,
      assignedRoleContext: row.assigned_role_context,
      status: row.status,
      isMandatory: row.is_mandatory,
      displayOrder: row.display_order,
      dueDate: row.due_date ? new Date(row.due_date) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      meetingId: row.meeting_id,
      learningProgramId: row.learning_program_id,
      evaluationId: row.evaluation_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapItem(row: any): OnboardingItem {
    return {
      id: row.id,
      organizationId: row.organization_id,
      planId: row.plan_id,
      taskId: row.task_id,
      templateItemId: row.template_item_id,
      itemType: row.item_type,
      title: row.title,
      status: row.status,
      itemMetadata: row.item_metadata || {},
      verifiedByPersonId: row.verified_by_person_id,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapTransfer(row: any): WorkforceTransfer {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      sourceBusinessUnitId: row.source_business_unit_id,
      targetBusinessUnitId: row.target_business_unit_id,
      sourceDepartmentId: row.source_department_id,
      targetDepartmentId: row.target_department_id,
      sourceTeamId: row.source_team_id,
      targetTeamId: row.target_team_id,
      sourceManagerId: row.source_manager_id,
      targetManagerId: row.target_manager_id,
      status: row.status,
      reason: row.reason,
      effectiveDate: new Date(row.effective_date),
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : null,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      approvedByPersonId: row.approved_by_person_id,
      executedAt: row.executed_at ? new Date(row.executed_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapPromotion(row: any): WorkforcePromotion {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      sourceJobTitle: row.source_job_title,
      targetJobTitle: row.target_job_title,
      sourcePersonRoleId: row.source_person_role_id,
      targetPersonRoleId: row.target_person_role_id,
      status: row.status,
      reason: row.reason,
      effectiveDate: new Date(row.effective_date),
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : null,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      approvedByPersonId: row.approved_by_person_id,
      executedAt: row.executed_at ? new Date(row.executed_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapOffboarding(row: any): WorkforceOffboarding {
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      exitReason: row.exit_reason,
      status: row.status,
      exitDate: new Date(row.exit_date),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapClearance(row: any): WorkforceOffboardingClearance {
    return {
      id: row.id,
      organizationId: row.organization_id,
      offboardingId: row.offboarding_id,
      clearanceType: row.clearance_type,
      departmentId: row.department_id,
      verifierPersonId: row.verifier_person_id,
      financialObligationId: row.financial_obligation_id,
      status: row.status,
      notes: row.notes,
      clearedAt: row.cleared_at ? new Date(row.cleared_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
