import { ValidationError } from '../../../shared/errors/index.js';

export type BudgetStatus = 'active' | 'closed';

export interface FinancialBudget {
  id: string;
  organizationId: string;
  businessUnitId?: string;
  departmentId?: string;
  projectId?: string;
  categoryId?: string;
  periodName: string;
  budgetAmount: number;
  allocatedAmount: number;
  spentAmount: number;
  periodStart: string;
  periodEnd: string;
  status: BudgetStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBudgetInput {
  businessUnitId?: string;
  departmentId?: string;
  projectId?: string;
  categoryId?: string;
  periodName: string;
  budgetAmount: number;
  periodStart: string;
  periodEnd: string;
}

export interface UpdateBudgetInput {
  budgetAmount?: number;
  status?: BudgetStatus;
}
