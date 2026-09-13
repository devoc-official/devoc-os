import { getDbClient, withTransaction } from '../../../database/index.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService, OutboxEventRecord } from '../../../events/outbox.service.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../../shared/errors/index.js';

export class MasterDataService {
  // ==========================================
  // 1. WORK CATEGORIES (M5)
  // ==========================================
  public static async listWorkCategories(organizationId: string, includeInactive = false) {
    const db = getDbClient();
    let query = `SELECT id, organization_id, name, code, description, active, created_at, updated_at
                 FROM work_categories
                 WHERE organization_id = $1`;
    if (!includeInactive) {
      query += ` AND active = true`;
    }
    query += ` ORDER BY name ASC;`;

    const res = await db.query<any>(query, [organizationId]);
    return res.rows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      code: r.code,
      description: r.description,
      isActive: r.active,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  }

  public static async createWorkCategory(
    organizationId: string,
    data: { name: string; code: string; description?: string },
    actorId?: string,
    requestId?: string
  ) {
    if (!data.name || !data.code) {
      throw new ValidationError('Name and code are required for work category');
    }
    const db = getDbClient();
    const existing = await db.query(
      `SELECT id FROM work_categories WHERE organization_id = $1 AND code = $2;`,
      [organizationId, data.code.trim()]
    );
    if (existing.rows.length > 0) {
      throw new ConflictError(`Work category with code '${data.code}' already exists in this organization`);
    }

    const { result, outboxRecord } = await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `INSERT INTO work_categories (organization_id, name, code, description, active, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW())
         RETURNING id, organization_id, name, code, description, active, created_at, updated_at;`,
        [organizationId, data.name.trim(), data.code.trim(), data.description || null]
      );

      const category = res.rows[0];

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'MASTER_DATA_CREATED',
        entityType: 'work_category',
        entityId: category.id,
        payload: { name: category.name, code: category.code },
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      const outboxRecord = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'master_data.created',
        entityType: 'work_category',
        entityId: category.id,
        actorId,
        payload: { organizationId, entityType: 'work_category', entityId: category.id, code: category.code },
        requestId,
        dbClient: txClient,
      });

      const result = {
        id: category.id,
        organizationId: category.organization_id,
        name: category.name,
        code: category.code,
        description: category.description,
        isActive: category.active,
        createdAt: new Date(category.created_at),
        updatedAt: new Date(category.updated_at),
      };

      return { result, outboxRecord };
    });

    // Post-commit dispatch (never inside transaction)
    await OutboxService.dispatchImmediate(outboxRecord);

    return result;
  }

  public static async updateWorkCategory(
    organizationId: string,
    id: string,
    data: { name?: string; description?: string; active?: boolean },
    actorId?: string,
    requestId?: string
  ) {
    const db = getDbClient();
    const checkRes = await db.query<any>(
      `SELECT id, name, description, active FROM work_categories WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (checkRes.rows.length === 0) {
      throw new NotFoundError(`Work category '${id}' not found in this organization`);
    }

    const previous = checkRes.rows[0];

    const { result, outboxRecord } = await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `UPDATE work_categories
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             active = COALESCE($3, active),
             updated_at = NOW()
         WHERE id = $4 AND organization_id = $5
         RETURNING id, organization_id, name, code, description, active, created_at, updated_at;`,
        [data.name, data.description, data.active, id, organizationId]
      );

      const updated = res.rows[0];

      const action = data.active === false ? 'MASTER_DATA_RETIRED' : 'MASTER_DATA_UPDATED';
      await AuditService.recordLog({
        organizationId,
        actorId,
        action,
        entityType: 'work_category',
        entityId: id,
        beforeState: { name: previous.name, active: previous.active },
        afterState: { name: updated.name, active: updated.active },
        payload: data,
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      let outboxRecord: OutboxEventRecord | undefined;
      if (data.active === false) {
        outboxRecord = await OutboxService.stageOutboxEvent({
          organizationId,
          eventName: 'master_data.retired',
          entityType: 'work_category',
          entityId: id,
          actorId,
          payload: { organizationId, entityType: 'work_category', entityId: id },
          requestId,
          dbClient: txClient,
        });
      }

      const result = {
        id: updated.id,
        organizationId: updated.organization_id,
        name: updated.name,
        code: updated.code,
        description: updated.description,
        isActive: updated.active,
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at),
      };

      return { result, outboxRecord };
    });

    // Post-commit dispatch (never inside transaction)
    if (outboxRecord) {
      await OutboxService.dispatchImmediate(outboxRecord);
    }

    return result;
  }

  public static async deleteOrRetireWorkCategory(
    organizationId: string,
    id: string,
    actorId?: string,
    requestId?: string
  ) {
    const db = getDbClient();
    const recordsCheck = await db.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM work_records WHERE category_id = $1;`,
      [id]
    );
    const refCount = recordsCheck.rows[0]?.count ?? 0;
    if (refCount > 0) {
      throw new ConflictError(
        `Cannot delete work category because it is referenced by ${refCount} historical work records. Deactivate it instead.`,
        { referencedTable: 'work_records', referencingCount: refCount }
      );
    }

    return this.updateWorkCategory(organizationId, id, { active: false }, actorId, requestId);
  }

  // ==========================================
  // 2. MEETING TYPES (M6)
  // ==========================================
  public static async listMeetingTypes(organizationId: string, includeInactive = false) {
    const db = getDbClient();
    let query = `SELECT id, organization_id, name, code, description, is_active, created_at, updated_at
                 FROM meeting_types
                 WHERE organization_id = $1`;
    if (!includeInactive) {
      query += ` AND is_active = true`;
    }
    query += ` ORDER BY name ASC;`;

    const res = await db.query<any>(query, [organizationId]);
    return res.rows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      code: r.code,
      description: r.description,
      isActive: r.is_active,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  }

  public static async createMeetingType(
    organizationId: string,
    data: { name: string; code: string; description?: string },
    actorId?: string,
    requestId?: string
  ) {
    if (!data.name || !data.code) {
      throw new ValidationError('Name and code are required for meeting type');
    }
    const db = getDbClient();
    const existing = await db.query(
      `SELECT id FROM meeting_types WHERE organization_id = $1 AND code = $2;`,
      [organizationId, data.code.trim()]
    );
    if (existing.rows.length > 0) {
      throw new ConflictError(`Meeting type with code '${data.code}' already exists in this organization`);
    }

    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `INSERT INTO meeting_types (organization_id, name, code, description, is_active, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW())
         RETURNING id, organization_id, name, code, description, is_active, created_at, updated_at;`,
        [organizationId, data.name.trim(), data.code.trim(), data.description || null]
      );

      const meetingType = res.rows[0];

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'MASTER_DATA_CREATED',
        entityType: 'meeting_type',
        entityId: meetingType.id,
        payload: { name: meetingType.name, code: meetingType.code },
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return {
        id: meetingType.id,
        organizationId: meetingType.organization_id,
        name: meetingType.name,
        code: meetingType.code,
        description: meetingType.description,
        isActive: meetingType.is_active,
        createdAt: new Date(meetingType.created_at),
        updatedAt: new Date(meetingType.updated_at),
      };
    });
  }

  public static async updateMeetingType(
    organizationId: string,
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
    actorId?: string,
    requestId?: string
  ) {
    const db = getDbClient();
    const checkRes = await db.query<any>(
      `SELECT id, name, description, is_active FROM meeting_types WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (checkRes.rows.length === 0) {
      throw new NotFoundError(`Meeting type '${id}' not found in this organization`);
    }

    const { result, outboxRecord } = await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `UPDATE meeting_types
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             is_active = COALESCE($3, is_active),
             updated_at = NOW()
         WHERE id = $4 AND organization_id = $5
         RETURNING id, organization_id, name, code, description, is_active, created_at, updated_at;`,
        [data.name, data.description, data.isActive, id, organizationId]
      );

      const updated = res.rows[0];
      const action = data.isActive === false ? 'MASTER_DATA_RETIRED' : 'MASTER_DATA_UPDATED';

      await AuditService.recordLog({
        organizationId,
        actorId,
        action,
        entityType: 'meeting_type',
        entityId: id,
        afterState: { name: updated.name, isActive: updated.is_active },
        payload: data,
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      let outboxRecord: OutboxEventRecord | undefined;
      if (data.isActive === false) {
        outboxRecord = await OutboxService.stageOutboxEvent({
          organizationId,
          eventName: 'master_data.retired',
          entityType: 'meeting_type',
          entityId: id,
          actorId,
          payload: { organizationId, entityType: 'meeting_type', entityId: id },
          requestId,
          dbClient: txClient,
        });
      }

      const result = {
        id: updated.id,
        organizationId: updated.organization_id,
        name: updated.name,
        code: updated.code,
        description: updated.description,
        isActive: updated.is_active,
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at),
      };

      return { result, outboxRecord };
    });

    // Post-commit dispatch (never inside transaction)
    if (outboxRecord) {
      await OutboxService.dispatchImmediate(outboxRecord);
    }

    return result;
  }

  public static async deleteOrRetireMeetingType(
    organizationId: string,
    id: string,
    actorId?: string,
    requestId?: string
  ) {
    const db = getDbClient();
    const refCheck = await db.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM meetings WHERE meeting_type_id = $1;`,
      [id]
    );
    const count = refCheck.rows[0]?.count ?? 0;
    if (count > 0) {
      throw new ConflictError(
        `Cannot delete meeting type because it is referenced by ${count} historical meetings. Deactivate it instead.`,
        { referencedTable: 'meetings', referencingCount: count }
      );
    }
    return this.updateMeetingType(organizationId, id, { isActive: false }, actorId, requestId);
  }

  // ==========================================
  // 3. EVALUATION TEMPLATES (M8)
  // ==========================================
  public static async listEvaluationTemplates(organizationId: string, includeInactive = false) {
    const db = getDbClient();
    let query = `SELECT id, organization_id, name, description, version, is_active, created_at, updated_at
                 FROM evaluation_templates
                 WHERE organization_id = $1`;
    if (!includeInactive) {
      query += ` AND is_active = true`;
    }
    query += ` ORDER BY name ASC, version DESC;`;

    const res = await db.query<any>(query, [organizationId]);
    return res.rows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      description: r.description,
      version: r.version,
      isActive: r.is_active,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  }

  public static async createEvaluationTemplate(
    organizationId: string,
    data: { name: string; description?: string; version?: number },
    actorId?: string,
    requestId?: string
  ) {
    if (!data.name) {
      throw new ValidationError('Name is required for evaluation template');
    }
    const db = getDbClient();
    const version = data.version || 1;

    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `INSERT INTO evaluation_templates (organization_id, name, description, version, is_active, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW())
         RETURNING id, organization_id, name, description, version, is_active, created_at, updated_at;`,
        [organizationId, data.name.trim(), data.description || null, version]
      );

      const template = res.rows[0];

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'MASTER_DATA_CREATED',
        entityType: 'evaluation_template',
        entityId: template.id,
        payload: { name: template.name, version: template.version },
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return {
        id: template.id,
        organizationId: template.organization_id,
        name: template.name,
        description: template.description,
        version: template.version,
        isActive: template.is_active,
        createdAt: new Date(template.created_at),
        updatedAt: new Date(template.updated_at),
      };
    });
  }

  public static async updateEvaluationTemplate(
    organizationId: string,
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
    actorId?: string,
    requestId?: string
  ) {
    const db = getDbClient();
    const checkRes = await db.query(
      `SELECT id FROM evaluation_templates WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (checkRes.rows.length === 0) {
      throw new NotFoundError(`Evaluation template '${id}' not found in this organization`);
    }

    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `UPDATE evaluation_templates
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             is_active = COALESCE($3, is_active),
             updated_at = NOW()
         WHERE id = $4 AND organization_id = $5
         RETURNING id, organization_id, name, description, version, is_active, created_at, updated_at;`,
        [data.name, data.description, data.isActive, id, organizationId]
      );

      const updated = res.rows[0];
      const action = data.isActive === false ? 'MASTER_DATA_RETIRED' : 'MASTER_DATA_UPDATED';

      await AuditService.recordLog({
        organizationId,
        actorId,
        action,
        entityType: 'evaluation_template',
        entityId: id,
        afterState: { name: updated.name, isActive: updated.is_active },
        payload: data,
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return {
        id: updated.id,
        organizationId: updated.organization_id,
        name: updated.name,
        description: updated.description,
        version: updated.version,
        isActive: updated.is_active,
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at),
      };
    });
  }

  // ==========================================
  // 4. FINANCE CATEGORIES (M9)
  // ==========================================
  public static async listFinanceCategories(organizationId: string, includeInactive = false) {
    const db = getDbClient();
    let query = `SELECT id, organization_id, name, code, category_type, description, is_active, created_at, updated_at
                 FROM finance_categories
                 WHERE organization_id = $1`;
    if (!includeInactive) {
      query += ` AND is_active = true`;
    }
    query += ` ORDER BY name ASC;`;

    const res = await db.query<any>(query, [organizationId]);
    return res.rows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      code: r.code,
      categoryType: r.category_type,
      description: r.description,
      isActive: r.is_active,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  }

  public static async createFinanceCategory(
    organizationId: string,
    data: { name: string; code: string; categoryType: 'revenue' | 'expense'; description?: string },
    actorId?: string,
    requestId?: string
  ) {
    if (!data.name || !data.code || !data.categoryType) {
      throw new ValidationError('Name, code, and categoryType are required for finance category');
    }
    if (data.categoryType !== 'revenue' && data.categoryType !== 'expense') {
      throw new ValidationError("Category type must be 'revenue' or 'expense'");
    }

    const db = getDbClient();
    const existing = await db.query(
      `SELECT id FROM finance_categories WHERE organization_id = $1 AND code = $2;`,
      [organizationId, data.code.trim()]
    );
    if (existing.rows.length > 0) {
      throw new ConflictError(`Finance category with code '${data.code}' already exists in this organization`);
    }

    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `INSERT INTO finance_categories (organization_id, name, code, category_type, description, is_active, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         RETURNING id, organization_id, name, code, category_type, description, is_active, created_at, updated_at;`,
        [organizationId, data.name.trim(), data.code.trim(), data.categoryType, data.description || null]
      );

      const category = res.rows[0];

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'MASTER_DATA_CREATED',
        entityType: 'finance_category',
        entityId: category.id,
        payload: { name: category.name, code: category.code, categoryType: category.category_type },
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return {
        id: category.id,
        organizationId: category.organization_id,
        name: category.name,
        code: category.code,
        categoryType: category.category_type,
        description: category.description,
        isActive: category.is_active,
        createdAt: new Date(category.created_at),
        updatedAt: new Date(category.updated_at),
      };
    });
  }

  public static async updateFinanceCategory(
    organizationId: string,
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
    actorId?: string,
    requestId?: string
  ) {
    const db = getDbClient();
    const checkRes = await db.query(
      `SELECT id FROM finance_categories WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (checkRes.rows.length === 0) {
      throw new NotFoundError(`Finance category '${id}' not found in this organization`);
    }

    const { result, outboxRecord } = await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `UPDATE finance_categories
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             is_active = COALESCE($3, is_active),
             updated_at = NOW()
         WHERE id = $4 AND organization_id = $5
         RETURNING id, organization_id, name, code, category_type, description, is_active, created_at, updated_at;`,
        [data.name, data.description, data.isActive, id, organizationId]
      );

      const updated = res.rows[0];
      const action = data.isActive === false ? 'MASTER_DATA_RETIRED' : 'MASTER_DATA_UPDATED';

      await AuditService.recordLog({
        organizationId,
        actorId,
        action,
        entityType: 'finance_category',
        entityId: id,
        afterState: { name: updated.name, isActive: updated.is_active },
        payload: data,
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      let outboxRecord: OutboxEventRecord | undefined;
      if (data.isActive === false) {
        outboxRecord = await OutboxService.stageOutboxEvent({
          organizationId,
          eventName: 'master_data.retired',
          entityType: 'finance_category',
          entityId: id,
          actorId,
          payload: { organizationId, entityType: 'finance_category', entityId: id },
          requestId,
          dbClient: txClient,
        });
      }

      const result = {
        id: updated.id,
        organizationId: updated.organization_id,
        name: updated.name,
        code: updated.code,
        categoryType: updated.category_type,
        description: updated.description,
        isActive: updated.is_active,
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at),
      };

      return { result, outboxRecord };
    });

    // Post-commit dispatch (never inside transaction)
    if (outboxRecord) {
      await OutboxService.dispatchImmediate(outboxRecord);
    }

    return result;
  }

  public static async deleteOrRetireFinanceCategory(
    organizationId: string,
    id: string,
    actorId?: string,
    requestId?: string
  ) {
    const db = getDbClient();
    const refCheck = await db.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM financial_obligations WHERE category_id = $1;`,
      [id]
    );
    const count = refCheck.rows[0]?.count ?? 0;
    if (count > 0) {
      throw new ConflictError(
        `Cannot delete finance category because it is referenced by ${count} historical financial obligations. Deactivate it instead.`,
        { referencedTable: 'financial_obligations', referencingCount: count }
      );
    }
    return this.updateFinanceCategory(organizationId, id, { isActive: false }, actorId, requestId);
  }

  // ==========================================
  // 5. SKILLS (M2)
  // ==========================================
  public static async listSkills(organizationId: string, includeInactive = false) {
    const db = getDbClient();
    let query = `SELECT id, organization_id, name, code, category, status, created_at, updated_at
                 FROM skills
                 WHERE organization_id = $1`;
    if (!includeInactive) {
      query += ` AND status = 'active'`;
    }
    query += ` ORDER BY name ASC;`;

    const res = await db.query<any>(query, [organizationId]);
    return res.rows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      code: r.code,
      category: r.category,
      status: r.status,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  }

  public static async createSkill(
    organizationId: string,
    data: { name: string; code: string; category?: string },
    actorId?: string,
    requestId?: string
  ) {
    if (!data.name || !data.code) {
      throw new ValidationError('Name and code are required for skill');
    }
    const db = getDbClient();
    const existing = await db.query(
      `SELECT id FROM skills WHERE organization_id = $1 AND code = $2;`,
      [organizationId, data.code.trim()]
    );
    if (existing.rows.length > 0) {
      throw new ConflictError(`Skill with code '${data.code}' already exists in this organization`);
    }

    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `INSERT INTO skills (organization_id, name, code, category, status, updated_at)
         VALUES ($1, $2, $3, $4, 'active', NOW())
         RETURNING id, organization_id, name, code, category, status, created_at, updated_at;`,
        [organizationId, data.name.trim(), data.code.trim(), data.category || null]
      );

      const skill = res.rows[0];

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'MASTER_DATA_CREATED',
        entityType: 'skill',
        entityId: skill.id,
        payload: { name: skill.name, code: skill.code },
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return {
        id: skill.id,
        organizationId: skill.organization_id,
        name: skill.name,
        code: skill.code,
        category: skill.category,
        status: skill.status,
        createdAt: new Date(skill.created_at),
        updatedAt: new Date(skill.updated_at),
      };
    });
  }

  public static async updateSkill(
    organizationId: string,
    id: string,
    data: { name?: string; category?: string; status?: 'active' | 'inactive' },
    actorId?: string,
    requestId?: string
  ) {
    const db = getDbClient();
    const checkRes = await db.query(
      `SELECT id FROM skills WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (checkRes.rows.length === 0) {
      throw new NotFoundError(`Skill '${id}' not found in this organization`);
    }

    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `UPDATE skills
         SET name = COALESCE($1, name),
             category = COALESCE($2, category),
             status = COALESCE($3, status),
             updated_at = NOW()
         WHERE id = $4 AND organization_id = $5
         RETURNING id, organization_id, name, code, category, status, created_at, updated_at;`,
        [data.name, data.category, data.status, id, organizationId]
      );

      const updated = res.rows[0];
      const action = data.status === 'inactive' ? 'MASTER_DATA_RETIRED' : 'MASTER_DATA_UPDATED';

      await AuditService.recordLog({
        organizationId,
        actorId,
        action,
        entityType: 'skill',
        entityId: id,
        afterState: { name: updated.name, status: updated.status },
        payload: data,
        requestId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return {
        id: updated.id,
        organizationId: updated.organization_id,
        name: updated.name,
        code: updated.code,
        category: updated.category,
        status: updated.status,
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at),
      };
    });
  }
}
