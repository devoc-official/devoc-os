import { getDbClient } from '../../../database/index.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import {
  FinancialTransaction,
  FinancialAllocation,
  TransactionState,
  CreateTransactionInput,
} from '../domain/financial-transaction.entity.js';
import { FinancialObligationRepository } from './financial-obligation.repository.js';

export class FinancialTransactionRepository {
  private obligationRepository: FinancialObligationRepository;

  constructor(obligationRepository?: FinancialObligationRepository) {
    this.obligationRepository = obligationRepository || new FinancialObligationRepository();
  }

  public async createTransaction(organizationId: string, input: CreateTransactionInput): Promise<FinancialTransaction> {
    const db = getDbClient();

    // Verify party exists
    const partyRes = await db.query(`SELECT id FROM financial_parties WHERE id = $1 AND organization_id = $2;`, [
      input.partyId,
      organizationId,
    ]);
    if (partyRes.rows.length === 0) {
      throw new NotFoundError(`Financial party '${input.partyId}' not found in organization`);
    }

    const tType = input.transactionType || 'payment';
    const state: TransactionState = input.postImmediately ? 'Posted' : 'Pending';
    const currency = input.currency || 'INR';
    const postedAt = input.postImmediately ? new Date().toISOString() : null;

    const res = await db.query<any>(
      `INSERT INTO financial_transactions (
        organization_id, party_id, direction, transaction_type, state, amount, unallocated_amount,
        currency, payment_mode, reference_number, notes, posted_at, original_transaction_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *;`,
      [
        organizationId,
        input.partyId,
        input.direction,
        tType,
        state,
        input.amount,
        currency,
        input.paymentMode,
        input.referenceNumber || null,
        input.notes || null,
        postedAt,
        input.originalTransactionId || null,
      ]
    );

    return this.getTransactionById(organizationId, res.rows[0].id);
  }

  public async getTransactionById(organizationId: string, transactionId: string): Promise<FinancialTransaction> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM financial_transactions WHERE id = $1 AND organization_id = $2;`,
      [transactionId, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Financial transaction '${transactionId}' not found in organization`);
    }

    const row = res.rows[0];

    const allocRes = await db.query<any>(
      `SELECT * FROM financial_allocations WHERE transaction_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [transactionId, organizationId]
    );

    const allocations: FinancialAllocation[] = allocRes.rows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      transactionId: r.transaction_id,
      obligationId: r.obligation_id,
      obligationItemId: r.obligation_item_id,
      allocatedAmount: Number(r.allocated_amount),
      notes: r.notes,
      createdAt: r.created_at,
    }));

    return {
      id: row.id,
      organizationId: row.organization_id,
      partyId: row.party_id,
      direction: row.direction,
      transactionType: row.transaction_type,
      state: row.state,
      amount: Number(row.amount),
      unallocatedAmount: Number(row.unallocated_amount),
      currency: row.currency,
      paymentMode: row.payment_mode,
      referenceNumber: row.reference_number,
      notes: row.notes,
      postedAt: row.posted_at,
      reversedAt: row.reversed_at,
      originalTransactionId: row.original_transaction_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      allocations,
    };
  }

  public async listTransactions(
    organizationId: string,
    filters?: { partyId?: string; direction?: string; state?: TransactionState }
  ): Promise<FinancialTransaction[]> {
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

    const query = `SELECT id FROM financial_transactions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC;`;
    const res = await db.query<any>(query, params);

    const result: FinancialTransaction[] = [];
    for (const r of res.rows) {
      result.push(await this.getTransactionById(organizationId, r.id));
    }
    return result;
  }

  public async updateTransactionState(
    organizationId: string,
    transactionId: string,
    targetState: TransactionState
  ): Promise<FinancialTransaction> {
    const db = getDbClient();
    const existing = await this.getTransactionById(organizationId, transactionId);

    let postedAt = existing.postedAt;
    let reversedAt = existing.reversedAt;

    const now = new Date().toISOString();
    if (targetState === 'Posted' && !postedAt) postedAt = now;
    if ((targetState === 'Reversed' || targetState === 'Refunded') && !reversedAt) reversedAt = now;

    await db.query(
      `UPDATE financial_transactions
       SET state = $1, posted_at = $2, reversed_at = $3, updated_at = NOW()
       WHERE id = $4 AND organization_id = $5;`,
      [targetState, postedAt || null, reversedAt || null, transactionId, organizationId]
    );

    return this.getTransactionById(organizationId, transactionId);
  }

  public async createAllocation(
    organizationId: string,
    transactionId: string,
    obligationId: string,
    allocatedAmount: number,
    obligationItemId?: string,
    notes?: string
  ): Promise<FinancialAllocation> {
    const db = getDbClient();

    const transaction = await this.getTransactionById(organizationId, transactionId);
    if (transaction.state !== 'Posted') {
      throw new ValidationError(`Cannot allocate from transaction in state '${transaction.state}'. Transaction must be Posted.`);
    }

    if (transaction.unallocatedAmount < allocatedAmount) {
      throw new ValidationError(
        `Allocation amount (${allocatedAmount}) exceeds available unallocated transaction amount (${transaction.unallocatedAmount})`
      );
    }

    const obligation = await this.obligationRepository.getObligationById(organizationId, obligationId);
    if (obligation.organizationId !== organizationId) {
      throw new NotFoundError(`Obligation '${obligationId}' not found in organization`);
    }

    const res = await db.query<any>(
      `INSERT INTO financial_allocations (organization_id, transaction_id, obligation_id, obligation_item_id, allocated_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [organizationId, transactionId, obligationId, obligationItemId || null, allocatedAmount, notes || null]
    );

    // Update transaction unallocated amount
    const newUnallocated = Math.max(0, transaction.unallocatedAmount - allocatedAmount);
    await db.query(
      `UPDATE financial_transactions SET unallocated_amount = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3;`,
      [newUnallocated, transactionId, organizationId]
    );

    // Recalculate obligation balance
    await this.obligationRepository.recalculateObligationAmounts(organizationId, obligationId);

    const r = res.rows[0];
    return {
      id: r.id,
      organizationId: r.organization_id,
      transactionId: r.transaction_id,
      obligationId: r.obligation_id,
      obligationItemId: r.obligation_item_id,
      allocatedAmount: Number(r.allocated_amount),
      notes: r.notes,
      createdAt: r.created_at,
    };
  }

  public async listAllocations(organizationId: string, obligationId?: string, transactionId?: string): Promise<FinancialAllocation[]> {
    const db = getDbClient();
    const conditions = [`organization_id = $1`];
    const params: any[] = [organizationId];

    if (obligationId) {
      params.push(obligationId);
      conditions.push(`obligation_id = $${params.length}`);
    }
    if (transactionId) {
      params.push(transactionId);
      conditions.push(`transaction_id = $${params.length}`);
    }

    const res = await db.query<any>(
      `SELECT * FROM financial_allocations WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC;`,
      params
    );

    return res.rows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      transactionId: r.transaction_id,
      obligationId: r.obligation_id,
      obligationItemId: r.obligation_item_id,
      allocatedAmount: Number(r.allocated_amount),
      notes: r.notes,
      createdAt: r.created_at,
    }));
  }
}
