import { ValidationError } from '../../../shared/errors/index.js';

export type CategoryType = 'revenue' | 'expense';

export interface FinanceCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  categoryType: CategoryType;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryInput {
  name: string;
  code: string;
  categoryType: CategoryType;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export function validateCategoryType(type: string): CategoryType {
  if (type !== 'revenue' && type !== 'expense') {
    throw new ValidationError(`Invalid category type: '${type}'. Must be 'revenue' or 'expense'.`);
  }
  return type as CategoryType;
}
