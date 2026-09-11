import { ValidationError } from '../../../shared/errors/index.js';

export type ObligationDirection = 'receivable' | 'payable';
export type ObligationState = 'Draft' | 'Issued' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Cancelled';
export type ItemType = 'charge' | 'discount' | 'fee';
export type AdjustmentType = 'waiver' | 'fine' | 'late_fee' | 'credit_note' | 'debit_note';

export interface ObligationItem {
  id: string;
  obligationId: string;
  title: string;
  description?: string;
  itemType: ItemType;
  unitAmount: number;
  quantity: number;
  totalAmount: number;
  createdAt?: string;
}

export interface FinancialAdjustment {
  id: string;
  organizationId: string;
  obligationId: string;
  adjustmentType: AdjustmentType;
  amount: number;
  reason: string;
  createdByPersonId?: string;
  createdAt?: string;
}

export interface FinancialObligation {
  id: string;
  organizationId: string;
  partyId: string;
  categoryId: string;
  direction: ObligationDirection;
  title: string;
  description?: string;
  currency: string;
  grossAmount: number;
  discountAmount: number;
  feeAmount: number;
  netAmount: number;
  balanceAmount: number;
  state: ObligationState;
  issueAt?: string;
  dueAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  branchId?: string;
  businessUnitId?: string;
  departmentId?: string;
  projectId?: string;
  targetType?: string;
  targetId?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: ObligationItem[];
  adjustments?: FinancialAdjustment[];
}

export interface CreateObligationInput {
  partyId: string;
  categoryId: string;
  direction: ObligationDirection;
  title: string;
  description?: string;
  currency?: string;
  issueAt?: string;
  dueAt?: string;
  branchId?: string;
  businessUnitId?: string;
  departmentId?: string;
  projectId?: string;
  targetType?: string;
  targetId?: string;
  items?: {
    title: string;
    description?: string;
    itemType: ItemType;
    unitAmount: number;
    quantity?: number;
  }[];
}

export function validateObligationStateTransition(current: ObligationState, target: ObligationState): void {
  if (current === target) return;

  if (current === 'Paid' || current === 'Cancelled') {
    throw new ValidationError(`Cannot transition from terminal obligation state '${current}' to '${target}'`);
  }

  const allowed: Record<ObligationState, ObligationState[]> = {
    Draft: ['Issued', 'Cancelled'],
    Issued: ['PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'],
    PartiallyPaid: ['Paid', 'Overdue', 'Cancelled'],
    Overdue: ['PartiallyPaid', 'Paid', 'Cancelled'],
    Paid: [],
    Cancelled: [],
  };

  if (!allowed[current].includes(target)) {
    throw new ValidationError(`Invalid obligation state transition from '${current}' to '${target}'`);
  }
}
