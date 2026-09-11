import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import {
  EvaluationTemplate,
  EvaluationCriterion,
  CreateTemplateInput,
  UpdateTemplateInput,
  validateCriterionType,
} from '../domain/evaluation-template.entity.js';

export class EvaluationTemplateRepository {
  public async createTemplate(organizationId: string, input: CreateTemplateInput): Promise<EvaluationTemplate> {
    const db = getDbClient();
    const res = await db.query<any>(
      `INSERT INTO evaluation_templates (organization_id, name, description, version, is_active)
       VALUES ($1, $2, $3, 1, true)
       RETURNING *;`,
      [organizationId, input.name, input.description || null]
    );

    const templateRow = res.rows[0];
    const criteria: EvaluationCriterion[] = [];

    if (input.criteria && input.criteria.length > 0) {
      for (let i = 0; i < input.criteria.length; i++) {
        const c = input.criteria[i];
        const cType = validateCriterionType(c.criterionType);
        const cRes = await db.query<any>(
          `INSERT INTO evaluation_criteria (template_id, "order", name, description, weight, criterion_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *;`,
          [templateRow.id, c.order ?? i + 1, c.name, c.description || null, c.weight ?? 1.0, cType]
        );
        criteria.push(this.mapCriterionRow(cRes.rows[0]));
      }
    }

    return {
      id: templateRow.id,
      organizationId: templateRow.organization_id,
      name: templateRow.name,
      description: templateRow.description,
      version: templateRow.version,
      isActive: templateRow.is_active,
      createdAt: templateRow.created_at,
      updatedAt: templateRow.updated_at,
      criteria,
    };
  }

  public async getTemplateById(organizationId: string, templateId: string): Promise<EvaluationTemplate> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM evaluation_templates WHERE id = $1 AND organization_id = $2;`,
      [templateId, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Evaluation template '${templateId}' not found in organization`);
    }

    const templateRow = res.rows[0];
    const cRes = await db.query<any>(
      `SELECT * FROM evaluation_criteria WHERE template_id = $1 ORDER BY "order" ASC;`,
      [templateId]
    );

    const criteria = cRes.rows.map((r) => this.mapCriterionRow(r));

    return {
      id: templateRow.id,
      organizationId: templateRow.organization_id,
      name: templateRow.name,
      description: templateRow.description,
      version: templateRow.version,
      isActive: templateRow.is_active,
      createdAt: templateRow.created_at,
      updatedAt: templateRow.updated_at,
      criteria,
    };
  }

  public async listTemplates(organizationId: string): Promise<EvaluationTemplate[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM evaluation_templates WHERE organization_id = $1 ORDER BY name ASC, version DESC;`,
      [organizationId]
    );

    const templates: EvaluationTemplate[] = [];
    for (const row of res.rows) {
      const cRes = await db.query<any>(
        `SELECT * FROM evaluation_criteria WHERE template_id = $1 ORDER BY "order" ASC;`,
        [row.id]
      );
      templates.push({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        description: row.description,
        version: row.version,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        criteria: cRes.rows.map((r) => this.mapCriterionRow(r)),
      });
    }

    return templates;
  }

  public async updateTemplate(organizationId: string, templateId: string, input: UpdateTemplateInput): Promise<EvaluationTemplate> {
    const db = getDbClient();
    const existing = await this.getTemplateById(organizationId, templateId);

    const newVersion = existing.version + 1;
    const newName = input.name || existing.name;
    const newDesc = input.description !== undefined ? input.description : existing.description;

    const res = await db.query<any>(
      `UPDATE evaluation_templates
       SET name = $1, description = $2, version = $3, updated_at = NOW()
       WHERE id = $4 AND organization_id = $5
       RETURNING *;`,
      [newName, newDesc || null, newVersion, templateId, organizationId]
    );

    const updatedRow = res.rows[0];

    if (input.criteria) {
      await db.query(`DELETE FROM evaluation_criteria WHERE template_id = $1;`, [templateId]);
      for (let i = 0; i < input.criteria.length; i++) {
        const c = input.criteria[i];
        const cType = validateCriterionType(c.criterionType);
        await db.query(
          `INSERT INTO evaluation_criteria (template_id, "order", name, description, weight, criterion_type)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [templateId, c.order ?? i + 1, c.name, c.description || null, c.weight ?? 1.0, cType]
        );
      }
    }

    return this.getTemplateById(organizationId, templateId);
  }

  public async softDeleteTemplate(organizationId: string, templateId: string): Promise<void> {
    const db = getDbClient();
    const res = await db.query(
      `UPDATE evaluation_templates SET is_active = false, updated_at = NOW() WHERE id = $1 AND organization_id = $2;`,
      [templateId, organizationId]
    );
    if (res.rowCount === 0) {
      throw new NotFoundError(`Evaluation template '${templateId}' not found in organization`);
    }
  }

  private mapCriterionRow(row: any): EvaluationCriterion {
    return {
      id: row.id,
      templateId: row.template_id,
      order: row.order,
      name: row.name,
      description: row.description,
      weight: Number(row.weight),
      criterionType: row.criterion_type,
      createdAt: row.created_at,
    };
  }
}
