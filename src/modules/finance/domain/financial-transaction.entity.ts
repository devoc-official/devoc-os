import { ValidationError } from '../../../shared/errors/index.js';

export type TransactionDirection = 'inflow' | 'outflow';
export type TransactionType = 'payment' | 'refund' | 'reversal' | 'adjustment';
export type TransactionState = 'Pending' | 'Posted' | 'Reversed' | 'Refunded' | 'Voided';
export type PaymentMode = 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'card' | 'other';

export interface FinancialAllocation {
  id: string;
  organizationId: string;
  transactionId: string;
  obligationId: string;
  obligationItemId?: string;
  allocatedAmount: number;
  notes?: string;
  createdAt?: string;
}

export interface FinancialTransaction {
  id: string;
  organizationId: string;
  partyId: string;
  direction: TransactionDirection;
  transactionType: TransactionType;
  state: TransactionState;
  amount: number;
  unallocatedAmount: number;
  currency: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  postedAt?: string;
  reversedAt?: string;
  originalTransactionId?: string;
  createdAt?: string;
  updatedAt?: string;
  allocations?: FinancialAllocation[];
}

export interface CreateTransactionInput {
  partyId: string;
  direction: TransactionDirection;
  transactionType?: TransactionType;
  amount: number;
  currency?: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  postImmediately?: boolean;
  originalTransactionId?: string;
}

export function validateTransactionStateTransition(current: TransactionState, target: TransactionState): void {
  if (current === target) return;

  if (current === 'Reversed' || current === 'Refunded' || current === 'Voided') {
    throw new ValidationError(`Cannot transition from terminal transaction state '${current}' to '${target}'`);
  }

  const allowed: Record<TransactionState, TransactionState[]> = {
    Pending: ['Posted', 'Voided'],
    Posted: ['Reversed', 'Refunded'],
    Reversed: [],
    Refunded: [],
    Voided: [],
  };

  if (!allowed[current].includes(target)) {
    throw new ValidationError(`Invalid transaction state transition from '${current}' to '${target}'`);
  }
}

export function assertTransactionMutable(transaction: FinancialTransaction): void {
  if (transaction.state !== 'Pending') {
    throw new ValidationError(
      `Financial transaction '${transaction.id}' is in immutable state '${transaction.state}'. Posted transactions cannot be edited or deleted.`
    );
  }
}
