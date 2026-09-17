import { FinancialTransactionRepository } from '../infrastructure/financial-transaction.repository.js';
import { FinancialObligationRepository } from '../infrastructure/financial-obligation.repository.js';
import {
  FinancialTransaction,
  FinancialAllocation,
  TransactionState,
  CreateTransactionInput,
  validateTransactionStateTransition,
  assertTransactionMutable,
} from '../domain/financial-transaction.entity.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';
import { ValidationError } from '../../../shared/errors/index.js';

export class FinancialTransactionService {
  private repository: FinancialTransactionRepository;
  private obligationRepository: FinancialObligationRepository;

  constructor(repository?: FinancialTransactionRepository, obligationRepository?: FinancialObligationRepository) {
    this.repository = repository || new FinancialTransactionRepository();
    this.obligationRepository = obligationRepository || new FinancialObligationRepository();
  }

  public async createTransaction(
    organizationId: string,
    input: CreateTransactionInput,
    actorUserId?: string
  ): Promise<FinancialTransaction> {
    if (input.amount <= 0) {
      throw new ValidationError('Transaction amount must be greater than zero');
    }

    const transaction = await this.repository.createTransaction(organizationId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_TRANSACTION_RECORDED',
      entityType: 'financial_transaction',
      entityId: transaction.id,
      payload: { direction: transaction.direction, amount: transaction.amount, state: transaction.state },
    });

    eventBus.publish({
      eventName: 'financial_transaction.created',
      organizationId,
      actorId: actorUserId,
      entityType: 'financial_transaction',
      entityId: transaction.id,
      payload: {
        direction: transaction.direction,
        amount: transaction.amount,
        state: transaction.state,
      },
    });

    if (transaction.state === 'Posted') {
      eventBus.publish({
        eventName: 'financial_transaction.posted',
        organizationId,
        actorId: actorUserId,
        entityType: 'financial_transaction',
        entityId: transaction.id,
        payload: {
          amount: transaction.amount,
          postedAt: transaction.postedAt,
        },
      });
    }

    return transaction;
  }

  public async getTransaction(organizationId: string, transactionId: string): Promise<FinancialTransaction> {
    return this.repository.getTransactionById(organizationId, transactionId);
  }

  public async listTransactions(
    organizationId: string,
    filters?: { partyId?: string; direction?: string; state?: TransactionState }
  ): Promise<FinancialTransaction[]> {
    return this.repository.listTransactions(organizationId, filters);
  }

  public async postTransaction(organizationId: string, transactionId: string, actorUserId?: string): Promise<FinancialTransaction> {
    const existing = await this.repository.getTransactionById(organizationId, transactionId);
    validateTransactionStateTransition(existing.state, 'Posted');

    const updated = await this.repository.updateTransactionState(organizationId, transactionId, 'Posted');

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_TRANSACTION_POSTED',
      entityType: 'financial_transaction',
      entityId: transactionId,
      payload: { amount: updated.amount },
    });

    eventBus.publish({
      eventName: 'financial_transaction.posted',
      organizationId,
      actorId: actorUserId,
      entityType: 'financial_transaction',
      entityId: transactionId,
      payload: {
        amount: updated.amount,
        postedAt: updated.postedAt,
      },
    });

    return updated;
  }

  public async reverseTransaction(
    organizationId: string,
    transactionId: string,
    reason: string,
    actorUserId?: string
  ): Promise<FinancialTransaction> {
    const existing = await this.repository.getTransactionById(organizationId, transactionId);
    if (existing.state !== 'Posted') {
      throw new ValidationError(`Only posted transactions can be reversed. Transaction '${transactionId}' is in state '${existing.state}'.`);
    }

    // Mark original transaction as Reversed
    const updatedOriginal = await this.repository.updateTransactionState(organizationId, transactionId, 'Reversed');

    // Create compensating transaction
    const compensatingDirection = existing.direction === 'inflow' ? 'outflow' : 'inflow';
    const compensatingTx = await this.repository.createTransaction(organizationId, {
      partyId: existing.partyId,
      direction: compensatingDirection,
      transactionType: 'reversal',
      amount: existing.amount,
      currency: existing.currency,
      paymentMode: existing.paymentMode,
      referenceNumber: `REV-${existing.id}`,
      notes: `Reversal of transaction ${existing.id}: ${reason}`,
      postImmediately: true,
      originalTransactionId: existing.id,
    });

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_TRANSACTION_REVERSED',
      entityType: 'financial_transaction',
      entityId: transactionId,
      payload: { reason, compensatingTransactionId: compensatingTx.id },
    });

    eventBus.publish({
      eventName: 'financial_transaction.reversed',
      organizationId,
      actorId: actorUserId,
      entityType: 'financial_transaction',
      entityId: transactionId,
      payload: {
        reason,
        compensatingTransactionId: compensatingTx.id,
      },
    });

    return updatedOriginal;
  }

  public async allocateTransaction(
    organizationId: string,
    transactionId: string,
    obligationId: string,
    allocatedAmount: number,
    obligationItemId?: string,
    notes?: string,
    actorUserId?: string
  ): Promise<FinancialAllocation> {
    if (allocatedAmount <= 0) {
      throw new ValidationError('Allocated amount must be greater than zero');
    }

    const allocation = await this.repository.createAllocation(
      organizationId,
      transactionId,
      obligationId,
      allocatedAmount,
      obligationItemId,
      notes
    );

    // Check obligation balance & auto-update state
    const obligation = await this.obligationRepository.getObligationById(organizationId, obligationId);
    if (obligation.balanceAmount <= 0.0001 && obligation.state !== 'Paid') {
      await this.obligationRepository.updateObligationState(organizationId, obligationId, 'Paid');
      eventBus.publish({
        eventName: 'financial_obligation.paid',
        organizationId,
        actorId: actorUserId,
        entityType: 'financial_obligation',
        entityId: obligationId,
        payload: { paidAt: new Date().toISOString() },
      });
    } else if (obligation.balanceAmount > 0.0001 && obligation.state === 'Issued') {
      await this.obligationRepository.updateObligationState(organizationId, obligationId, 'PartiallyPaid');
    }

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_ALLOCATION_CREATED',
      entityType: 'financial_allocation',
      entityId: allocation.id,
      payload: { transactionId, obligationId, allocatedAmount },
    });

    eventBus.publish({
      eventName: 'financial_allocation.created',
      organizationId,
      actorId: actorUserId,
      entityType: 'financial_allocation',
      entityId: allocation.id,
      payload: {
        transactionId,
        obligationId,
        allocatedAmount,
      },
    });

    return allocation;
  }

  public async listAllocations(
    organizationId: string,
    obligationId?: string,
    transactionId?: string
  ): Promise<FinancialAllocation[]> {
    return this.repository.listAllocations(organizationId, obligationId, transactionId);
  }
}
