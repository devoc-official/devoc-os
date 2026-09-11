import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import {
  FinancialBudget,
  CreateBudgetInput,
  UpdateBudgetInput,
} from '../domain/financial-budget.entity.js';

export class FinancialBudgetRepository {
  public async createBudget(organizationId: string, input: CreateBudgetInput): Promise<FinancialBudget> {
    const db = getDbClient();

    const res = await db.query<any>(
      `INSERT INTO financial_budgets (
        organization_id, business_unit_id, department_id, project_id, category_id,
        period_name, budget_amount, allocated_amount, spent_amount, period_start, period_end, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, $8, $9, 'active')
       RETURNING *;`,
      [
        organizationId,
        input.businessUnitId || null,
        input.departmentId || null,
        input.projectId || null,
        input.categoryId || null,
        input.periodName,
        input.budgetAmount,
        input.periodStart,
        input.periodEnd,
      ]
    );

    return this.mapBudgetRow(res.rows[0]);
  }

  public async getBudgetById(organizationId: string, budgetId: string): Promise<FinancialBudget> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM financial_budgets WHERE id = $1 AND organization_id = $2;`,
      [budgetId, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Financial budget '${budgetId}' not found in organization`);
    }

    return this.mapBudgetRow(res.rows[0]);
  }

  public async listBudgets(
    organizationId: string,
    filters?: { businessUnitId?: string; projectId?: string; status?: string }
  ): Promise<FinancialBudget[]> {
    const db = getDbClient();
    const conditions = [`organization_id = $1`];
    const params: any[] = [organizationId];

    if (filters?.businessUnitId) {
      params.push(filters.businessUnitId);
      conditions.push(`business_unit_id = $${params.length}`);
    }
    if (filters?.projectId) {
      params.push(filters.projectId);
      conditions.push(`project_id = $${params.length}`);
    }
    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }

    const query = `SELECT * FROM financial_budgets WHERE ${conditions.join(' AND ')} ORDER BY period_start DESC;`;
    const res = await db.query<any>(query, params);

    return res.rows.map((r) => this.mapBudgetRow(r));
  }

  public async updateBudget(organizationId: string, budgetId: string, input: UpdateBudgetInput): Promise<FinancialBudget> {
    const db = getDbClient();
    const existing = await this.getBudgetById(organizationId, budgetId);

    const newAmount = input.budgetAmount !== undefined ? input.budgetAmount : existing.budgetAmount;
    const newStatus = input.status !== undefined ? input.status : existing.status;

    const res = await db.query<any>(
      `UPDATE financial_budgets
       SET budget_amount = $1, status = $2, updated_at = NOW()
       WHERE id = $3 AND organization_id = $4
       RETURNING *;`,
      [newAmount, newStatus, budgetId, organizationId]
    );

    return this.mapBudgetRow(res.rows[0]);
  }

  private mapBudgetRow(row: any): FinancialBudget {
    return {
      id: row.id,
      organizationId: row.organization_id,
      businessUnitId: row.business_unit_id,
      departmentId: row.department_id,
      projectId: row.project_id,
      categoryId: row.category_id,
      periodName: row.period_name,
      budgetAmount: Number(row.budget_amount),
      allocatedAmount: Number(row.allocated_amount),
      spentAmount: Number(row.spent_amount),
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
