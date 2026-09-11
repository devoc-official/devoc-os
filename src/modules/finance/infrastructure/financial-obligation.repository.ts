import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import {
  FinancialObligation,
  ObligationItem,
  FinancialAdjustment,
  ObligationState,
  AdjustmentType,
  CreateObligationInput,
} from '../domain/financial-obligation.entity.js';

export class FinancialObligationRepository {
  public async createObligation(organizationId: string, input: CreateObligationInput): Promise<FinancialObligation> {
    const db = getDbClient();

    // Verify party exists
    const partyRes = await db.query(`SELECT id FROM financial_parties WHERE id = $1 AND organization_id = $2;`, [
      input.partyId,
      organizationId,
    ]);
    if (partyRes.rows.length === 0) {
      throw new NotFoundError(`Financial party '${input.partyId}' not found in organization`);
    }

    // Verify category exists
    const catRes = await db.query(`SELECT id FROM finance_categories WHERE id = $1 AND organization_id = $2;`, [
      input.categoryId,
      organizationId,
    ]);
    if (catRes.rows.length === 0) {
      throw new NotFoundError(`Finance category '${input.categoryId}' not found in organization`);
    }

    const currency = input.currency || 'INR';

    const res = await db.query<any>(
      `INSERT INTO financial_obligations (
        organization_id, party_id, category_id, direction, title, description, currency,
        gross_amount, discount_amount, fee_amount, net_amount, balance_amount, state,
        issue_at, due_at, branch_id, business_unit_id, department_id, project_id, target_type, target_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 0, 0, 'Draft', $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *;`,
      [
        organizationId,
        input.partyId,
        input.categoryId,
        input.direction,
        input.title,
        input.description || null,
        currency,
        input.issueAt || null,
        input.dueAt || null,
        input.branchId || null,
        input.businessUnitId || null,
        input.departmentId || null,
        input.projectId || null,
        input.targetType || null,
        input.targetId || null,
      ]
    );

    const obligationId = res.rows[0].id;

    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const qty = item.quantity ?? 1.0;
        const total = item.unitAmount * qty;
        await db.query(
          `INSERT INTO financial_obligation_items (obligation_id, title, description, item_type, unit_amount, quantity, total_amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [obligationId, item.title, item.description || null, item.itemType, item.unitAmount, qty, total]
        );
      }
    }

    await this.recalculateObligationAmounts(organizationId, obligationId);
    return this.getObligationById(organizationId, obligationId);
  }

  public async getObligationById(organizationId: string, obligationId: string): Promise<FinancialObligation> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM financial_obligations WHERE id = $1 AND organization_id = $2;`,
      [obligationId, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Financial obligation '${obligationId}' not found in organization`);
    }

    const row = res.rows[0];

    const itemsRes = await db.query<any>(
      `SELECT * FROM financial_obligation_items WHERE obligation_id = $1 ORDER BY created_at ASC;`,
      [obligationId]
    );
    const items: ObligationItem[] = itemsRes.rows.map((r) => ({
      id: r.id,
      obligationId: r.obligation_id,
      title: r.title,
      description: r.description,
      itemType: r.item_type,
      unitAmount: Number(r.unit_amount),
      quantity: Number(r.quantity),
      totalAmount: Number(r.total_amount),
      createdAt: r.created_at,
    }));

    const adjRes = await db.query<any>(
      `SELECT * FROM financial_adjustments WHERE obligation_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [obligationId, organizationId]
    );
    const adjustments: FinancialAdjustment[] = adjRes.rows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      obligationId: r.obligation_id,
      adjustmentType: r.adjustment_type,
      amount: Number(r.amount),
      reason: r.reason,
      createdByPersonId: r.created_by_person_id,
      createdAt: r.created_at,
    }));

    return {
      id: row.id,
      organizationId: row.organization_id,
      partyId: row.party_id,
      categoryId: row.category_id,
      direction: row.direction,
      title: row.title,
      description: row.description,
      currency: row.currency,
      grossAmount: Number(row.gross_amount),
      discountAmount: Number(row.discount_amount),
      feeAmount: Number(row.fee_amount),
      netAmount: Number(row.net_amount),
      balanceAmount: Number(row.balance_amount),
      state: row.state,
      issueAt: row.issue_at,
      dueAt: row.due_at,
      paidAt: row.paid_at,
      cancelledAt: row.cancelled_at,
      branchId: row.branch_id,
      businessUnitId: row.business_unit_id,
      departmentId: row.department_id,
      projectId: row.project_id,
      targetType: row.target_type,
      targetId: row.target_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items,
      adjustments,
    };
  }

  public async listObligations(
    organizationId: string,
    filters?: {
      partyId?: string;
      direction?: string;
      state?: ObligationState;
      projectId?: string;
      businessUnitId?: string;
    }
  ): Promise<FinancialObligation[]> {
    const db = getDbClient();
    const conditions = [`organization_id = $1`];
    const params: any[] = [organizationId];

    if (filters?.partyId) {
      params.push(filters.partyId);
      conditions.push(`party_id = $${params.length}`);
    }
    if (filters?.direction) {
      params.push(filters.direction);
      conditions.push(`direction = $${params.length}`);
    }
    if (filters?.state) {
      params.push(filters.state);
      conditions.push(`state = $${params.length}`);
    }
    if (filters?.projectId) {
      params.push(filters.projectId);
      conditions.push(`project_id = $${params.length}`);
    }
    if (filters?.businessUnitId) {
      params.push(filters.businessUnitId);
      conditions.push(`business_unit_id = $${params.length}`);
    }

    const query = `SELECT id FROM financial_obligations WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC;`;
    const res = await db.query<any>(query, params);

    const result: FinancialObligation[] = [];
    for (const row of res.rows) {
      result.push(await this.getObligationById(organizationId, row.id));
    }
    return result;
  }

  public async updateObligationState(
    organizationId: string,
    obligationId: string,
    targetState: ObligationState
  ): Promise<FinancialObligation> {
    const db = getDbClient();
    const existing = await this.getObligationById(organizationId, obligationId);

    let issueAt = existing.issueAt;
    let paidAt = existing.paidAt;
    let cancelledAt = existing.cancelledAt;

    const now = new Date().toISOString();
    if (targetState === 'Issued' && !issueAt) issueAt = now;
    if (targetState === 'Paid') paidAt = now;
    if (targetState === 'Cancelled') cancelledAt = now;

    await db.query(
      `UPDATE financial_obligations
       SET state = $1, issue_at = $2, paid_at = $3, cancelled_at = $4, updated_at = NOW()
       WHERE id = $5 AND organization_id = $6;`,
      [targetState, issueAt || null, paidAt || null, cancelledAt || null, obligationId, organizationId]
    );

    return this.getObligationById(organizationId, obligationId);
  }

  public async addAdjustment(
    organizationId: string,
    obligationId: string,
    adjustmentType: AdjustmentType,
    amount: number,
    reason: string,
    createdByPersonId?: string
  ): Promise<FinancialAdjustment> {
    const db = getDbClient();
    await this.getObligationById(organizationId, obligationId);

    let validPersonId: string | null = null;
    if (createdByPersonId) {
      const personCheck = await db.query(`SELECT id FROM people WHERE id = $1 AND organization_id = $2;`, [
        createdByPersonId,
        organizationId,
      ]);
      if (personCheck.rows.length > 0) {
        validPersonId = createdByPersonId;
      }
    }

    const res = await db.query<any>(
      `INSERT INTO financial_adjustments (organization_id, obligation_id, adjustment_type, amount, reason, created_by_person_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [organizationId, obligationId, adjustmentType, amount, reason, validPersonId]
    );

    await this.recalculateObligationAmounts(organizationId, obligationId);

    const r = res.rows[0];
    return {
      id: r.id,
      organizationId: r.organization_id,
      obligationId: r.obligation_id,
      adjustmentType: r.adjustment_type,
      amount: Number(r.amount),
      reason: r.reason,
      createdByPersonId: r.created_by_person_id,
      createdAt: r.created_at,
    };
  }

  public async recalculateObligationAmounts(organizationId: string, obligationId: string): Promise<void> {
    const db = getDbClient();

    // 1. Calculate items sum
    const itemsRes = await db.query<any>(
      `SELECT item_type, SUM(total_amount) as total FROM financial_obligation_items WHERE obligation_id = $1 GROUP BY item_type;`,
      [obligationId]
    );

    let gross = 0;
    let discount = 0;
    let fee = 0;

    for (const r of itemsRes.rows) {
      const val = Number(r.total);
      if (r.item_type === 'charge') gross += val;
      else if (r.item_type === 'discount') discount += val;
      else if (r.item_type === 'fee') fee += val;
    }

    // 2. Calculate adjustments sum
    const adjRes = await db.query<any>(
      `SELECT adjustment_type, SUM(amount) as total FROM financial_adjustments WHERE obligation_id = $1 GROUP BY adjustment_type;`,
      [obligationId]
    );

    for (const r of adjRes.rows) {
      const val = Number(r.total);
      if (r.adjustment_type === 'waiver' || r.adjustment_type === 'credit_note') {
        discount += val;
      } else if (r.adjustment_type === 'fine' || r.adjustment_type === 'late_fee' || r.adjustment_type === 'debit_note') {
        fee += val;
      }
    }

    const net = Math.max(0, gross - discount + fee);

    // 3. Calculate total allocated paid amount
    const allocRes = await db.query<any>(
      `SELECT SUM(allocated_amount) as total FROM financial_allocations WHERE obligation_id = $1;`,
      [obligationId]
    );
    const allocatedPaid = Number(allocRes.rows[0]?.total || 0);

    const balance = Math.max(0, net - allocatedPaid);

    // Update obligation table
    await db.query(
      `UPDATE financial_obligations
       SET gross_amount = $1, discount_amount = $2, fee_amount = $3, net_amount = $4, balance_amount = $5, updated_at = NOW()
       WHERE id = $6 AND organization_id = $7;`,
      [gross, discount, fee, net, balance, obligationId, organizationId]
    );
  }
}
