import { describe, it, expect } from 'vitest';
import { validateObligationStateTransition } from '../../src/modules/finance/domain/financial-obligation.entity.js';
import {
  validateTransactionStateTransition,
  assertTransactionMutable,
  FinancialTransaction,
} from '../../src/modules/finance/domain/financial-transaction.entity.js';
import { validateCategoryType } from '../../src/modules/finance/domain/finance-category.entity.js';
import { validatePartyType } from '../../src/modules/finance/domain/financial-party.entity.js';

describe('Milestone 9 — Finance Entity & Immutability Unit Tests', () => {
  it('1. Obligation state transitions — valid', () => {
    expect(() => validateObligationStateTransition('Draft', 'Issued')).not.toThrow();
    expect(() => validateObligationStateTransition('Issued', 'PartiallyPaid')).not.toThrow();
    expect(() => validateObligationStateTransition('PartiallyPaid', 'Paid')).not.toThrow();
    expect(() => validateObligationStateTransition('Issued', 'Overdue')).not.toThrow();
    expect(() => validateObligationStateTransition('Issued', 'Cancelled')).not.toThrow();
  });

  it('2. Obligation state transitions — invalid terminal state mutations', () => {
    expect(() => validateObligationStateTransition('Paid', 'Issued')).toThrow();
    expect(() => validateObligationStateTransition('Cancelled', 'Draft')).toThrow();
    expect(() => validateObligationStateTransition('Draft', 'Paid')).toThrow();
  });

  it('3. Transaction state transitions — valid', () => {
    expect(() => validateTransactionStateTransition('Pending', 'Posted')).not.toThrow();
    expect(() => validateTransactionStateTransition('Pending', 'Voided')).not.toThrow();
    expect(() => validateTransactionStateTransition('Posted', 'Reversed')).not.toThrow();
    expect(() => validateTransactionStateTransition('Posted', 'Refunded')).not.toThrow();
  });

  it('4. Transaction state transitions — invalid terminal state mutations', () => {
    expect(() => validateTransactionStateTransition('Reversed', 'Posted')).toThrow();
    expect(() => validateTransactionStateTransition('Refunded', 'Pending')).toThrow();
    expect(() => validateTransactionStateTransition('Voided', 'Posted')).toThrow();
  });

  it('5. Transaction Immutability Rule — throws error when attempting to mutate posted/reversed transaction', () => {
    const postedTx: FinancialTransaction = {
      id: 'tx-100',
      organizationId: 'org-1',
      partyId: 'party-1',
      direction: 'inflow',
      transactionType: 'payment',
      state: 'Posted',
      amount: 1000,
      unallocatedAmount: 1000,
      currency: 'INR',
      paymentMode: 'bank_transfer',
    };

    expect(() => assertTransactionMutable(postedTx)).toThrow(/immutable state 'Posted'/);
  });

  it('6. Validation helpers for category and party types', () => {
    expect(validateCategoryType('revenue')).toBe('revenue');
    expect(validateCategoryType('expense')).toBe('expense');
    expect(() => validateCategoryType('invalid' as any)).toThrow();

    expect(validatePartyType('person')).toBe('person');
    expect(validatePartyType('client')).toBe('client');
    expect(validatePartyType('vendor')).toBe('vendor');
    expect(() => validatePartyType('invalid' as any)).toThrow();
  });
});
