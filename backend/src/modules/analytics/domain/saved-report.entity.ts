import { PeriodType } from './metric-result.entity.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { ALLOWED_DIMENSIONS } from './source-registry.js';

export interface TimeWindowConfig {
  periodType?: PeriodType;
  startDate?: string;
  endDate?: string;
}

export interface SortByConfig {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface SavedReport {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  metricIds: string[];
  dimensions: string[];
  filters: Record<string, any>;
  timeWindow: TimeWindowConfig;
  groupBy: string[];
  sortBy: SortByConfig[];
  createdBy?: string | null;
  isPublic: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateSavedReportInput {
  name: string;
  description?: string | null;
  metricIds: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  timeWindow?: TimeWindowConfig;
  groupBy?: string[];
  sortBy?: SortByConfig[];
  isPublic?: boolean;
}

export interface UpdateSavedReportInput {
  name?: string;
  description?: string | null;
  metricIds?: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  timeWindow?: TimeWindowConfig;
  groupBy?: string[];
  sortBy?: SortByConfig[];
  isPublic?: boolean;
}

export function validateSavedReportInput(input: CreateSavedReportInput): void {
  if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
    throw new ValidationError('Report name is required');
  }

  if (!input.metricIds || !Array.isArray(input.metricIds) || input.metricIds.length === 0) {
    throw new ValidationError('Report requires at least one metric ID in metricIds');
  }

  if (input.dimensions && Array.isArray(input.dimensions)) {
    for (const dim of input.dimensions) {
      if (!ALLOWED_DIMENSIONS.includes(dim)) {
        throw new ValidationError(`Unsupported report dimension '${dim}'`);
      }
    }
  }

  if (input.groupBy && Array.isArray(input.groupBy)) {
    for (const group of input.groupBy) {
      if (!ALLOWED_DIMENSIONS.includes(group)) {
        throw new ValidationError(`Unsupported group-by field '${group}'`);
      }
    }
  }
}
