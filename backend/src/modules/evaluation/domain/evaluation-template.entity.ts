import { ValidationError } from '../../../shared/errors/index.js';

export type CriterionType = 'numeric' | 'rating' | 'qualitative';

export interface EvaluationCriterion {
  id: string;
  templateId: string;
  order: number;
  name: string;
  description?: string;
  weight: number;
  criterionType: CriterionType;
  createdAt?: string;
}

export interface EvaluationTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  criteria?: EvaluationCriterion[];
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  criteria?: {
    order?: number;
    name: string;
    description?: string;
    weight?: number;
    criterionType: CriterionType;
  }[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  criteria?: {
    order?: number;
    name: string;
    description?: string;
    weight?: number;
    criterionType: CriterionType;
  }[];
}

export function validateCriterionType(type: string): CriterionType {
  const validTypes: CriterionType[] = ['numeric', 'rating', 'qualitative'];
  if (!validTypes.includes(type as CriterionType)) {
    throw new ValidationError(`Invalid criterion type: '${type}'. Must be one of: ${validTypes.join(', ')}`);
  }
  return type as CriterionType;
}

export function validateCriterionValue(type: CriterionType, value: string): void {
  if (value === undefined || value === null || value.trim() === '') {
    throw new ValidationError('Criterion result value cannot be empty');
  }

  if (type === 'numeric') {
    const num = Number(value);
    if (isNaN(num)) {
      throw new ValidationError(`Value '${value}' is not a valid number for numeric criterion`);
    }
  }
}
