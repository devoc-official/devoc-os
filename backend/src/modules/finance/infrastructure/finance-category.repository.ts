import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import {
  FinanceCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
  validateCategoryType,
} from '../domain/finance-category.entity.js';

export class FinanceCategoryRepository {
  public async createCategory(organizationId: string, input: CreateCategoryInput): Promise<FinanceCategory> {
    const db = getDbClient();
    const cType = validateCategoryType(input.categoryType);

    const res = await db.query<any>(
      `INSERT INTO finance_categories (organization_id, name, code, category_type, description, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *;`,
      [organizationId, input.name, input.code, cType, input.description || null]
    );

    return this.mapCategoryRow(res.rows[0]);
  }

  public async getCategoryById(organizationId: string, categoryId: string): Promise<FinanceCategory> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM finance_categories WHERE id = $1 AND organization_id = $2;`,
      [categoryId, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Finance category '${categoryId}' not found in organization`);
    }

    return this.mapCategoryRow(res.rows[0]);
  }

  public async listCategories(organizationId: string): Promise<FinanceCategory[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM finance_categories WHERE organization_id = $1 ORDER BY name ASC;`,
      [organizationId]
    );
    return res.rows.map((r) => this.mapCategoryRow(r));
  }

  public async updateCategory(organizationId: string, categoryId: string, input: UpdateCategoryInput): Promise<FinanceCategory> {
    const db = getDbClient();
    const existing = await this.getCategoryById(organizationId, categoryId);

    const newName = input.name !== undefined ? input.name : existing.name;
    const newDesc = input.description !== undefined ? input.description : existing.description;
    const newActive = input.isActive !== undefined ? input.isActive : existing.isActive;

    const res = await db.query<any>(
      `UPDATE finance_categories
       SET name = $1, description = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4 AND organization_id = $5
       RETURNING *;`,
      [newName, newDesc || null, newActive, categoryId, organizationId]
    );

    return this.mapCategoryRow(res.rows[0]);
  }

  private mapCategoryRow(row: any): FinanceCategory {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      categoryType: row.category_type,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
