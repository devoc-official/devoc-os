import { apiClient } from './client';

export type ObligationState = 'Draft' | 'Issued' | 'PartiallyPaid' | 'Paid' | 'Cancelled' | 'Overdue';
export type TransactionState = 'Draft' | 'Posted' | 'Reversed';
export type Direction = 'receivable' | 'payable' | 'inflow' | 'outflow';

export interface FinanceCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  categoryType: 'revenue' | 'expense';
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialParty {
  id: string;
  organizationId: string;
  partyType: 'client' | 'person' | 'vendor' | 'partner';
  name: string;
  email?: string | null;
  phone?: string | null;
  personId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ObligationItem {
  id?: string;
  title: string;
  itemType: 'charge' | 'discount' | 'tax' | 'fee';
  unitAmount: number;
  quantity: number;
  totalAmount?: number;
}

export interface Obligation {
  id: string;
  organizationId: string;
  partyId: string;
  categoryId: string;
  direction: 'receivable' | 'payable';
  title: string;
  description?: string | null;
  currency: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount?: number;
  balanceAmount: number;
  state: ObligationState;
  dueDate?: string | null;
  issuedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  organizationId: string;
  partyId: string;
  direction: 'inflow' | 'outflow';
  transactionType: 'payment' | 'refund' | 'adjustment';
  amount: number;
  currency: string;
  paymentMode: 'bank_transfer' | 'card' | 'cash' | 'upi' | 'other';
  referenceNumber?: string | null;
  state: TransactionState;
  unallocatedAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialAllocation {
  id: string;
  organizationId: string;
  transactionId: string;
  obligationId: string;
  allocatedAmount: number;
  notes?: string | null;
  createdAt: string;
}

export interface OperationalBudget {
  id: string;
  organizationId: string;
  businessUnitId?: string | null;
  periodName: string;
  budgetAmount: number;
  allocatedAmount?: number;
  spentAmount?: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export const financeApi = {
  listCategories: async (organizationId: string): Promise<FinanceCategory[]> => {
    return apiClient.get<FinanceCategory[]>('/finance/categories', { organizationId });
  },

  createCategory: async (organizationId: string, payload: Partial<FinanceCategory>): Promise<FinanceCategory> => {
    return apiClient.post<FinanceCategory>('/finance/categories', payload, { organizationId });
  },

  listParties: async (organizationId: string, params?: { partyType?: string }): Promise<FinancialParty[]> => {
    return apiClient.get<FinancialParty[]>('/finance/parties', { organizationId, params });
  },

  getParty: async (organizationId: string, partyId: string): Promise<FinancialParty> => {
    return apiClient.get<FinancialParty>(`/finance/parties/${partyId}`, { organizationId });
  },

  createParty: async (organizationId: string, payload: Partial<FinancialParty>): Promise<FinancialParty> => {
    return apiClient.post<FinancialParty>('/finance/parties', payload, { organizationId });
  },

  listObligations: async (
    organizationId: string,
    params?: { direction?: string; state?: string; partyId?: string }
  ): Promise<Obligation[]> => {
    return apiClient.get<Obligation[]>('/finance/obligations', { organizationId, params });
  },

  getObligation: async (organizationId: string, obligationId: string): Promise<Obligation> => {
    return apiClient.get<Obligation>(`/finance/obligations/${obligationId}`, { organizationId });
  },

  createObligation: async (
    organizationId: string,
    payload: {
      partyId: string;
      categoryId: string;
      direction: 'receivable' | 'payable';
      title: string;
      description?: string;
      currency?: string;
      items?: ObligationItem[];
      dueDate?: string;
    }
  ): Promise<Obligation> => {
    return apiClient.post<Obligation>('/finance/obligations', payload, { organizationId });
  },

  issueObligation: async (organizationId: string, obligationId: string): Promise<Obligation> => {
    return apiClient.post<Obligation>(`/finance/obligations/${obligationId}/issue`, {}, { organizationId });
  },

  listTransactions: async (
    organizationId: string,
    params?: { direction?: string; state?: string; partyId?: string }
  ): Promise<FinancialTransaction[]> => {
    return apiClient.get<FinancialTransaction[]>('/finance/transactions', { organizationId, params });
  },

  createTransaction: async (
    organizationId: string,
    payload: {
      partyId: string;
      direction: 'inflow' | 'outflow';
      transactionType: 'payment' | 'refund' | 'adjustment';
      amount: number;
      currency?: string;
      paymentMode?: string;
      referenceNumber?: string;
      postImmediately?: boolean;
    }
  ): Promise<FinancialTransaction> => {
    return apiClient.post<FinancialTransaction>('/finance/transactions', payload, { organizationId });
  },

  createAllocation: async (
    organizationId: string,
    payload: { transactionId: string; obligationId: string; allocatedAmount: number; notes?: string }
  ): Promise<FinancialAllocation> => {
    return apiClient.post<FinancialAllocation>('/finance/allocations', payload, { organizationId });
  },

  listBudgets: async (organizationId: string): Promise<OperationalBudget[]> => {
    return apiClient.get<OperationalBudget[]>('/finance/budgets', { organizationId });
  },

  createBudget: async (organizationId: string, payload: Partial<OperationalBudget>): Promise<OperationalBudget> => {
    return apiClient.post<OperationalBudget>('/finance/budgets', payload, { organizationId });
  },
};
