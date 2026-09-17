export type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface MetricResult {
  id: string;
  organizationId: string;
  metricDefinitionId: string;
  periodType: PeriodType;
  periodStart: Date | string;
  periodEnd: Date | string;
  dimensionValues: Record<string, any>;
  numericValue: number;
  details?: Record<string, any> | null;
  calculationVersion: number;
  calculationRunId: string;
  calculatedAt: Date | string;
  createdAt: Date | string;
}

export interface MetricResultDto {
  metricDefinitionId: string;
  code?: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  dimensionValues: Record<string, any>;
  numericValue: number;
  details?: Record<string, any> | null;
  calculationVersion: number;
  calculationRunId: string;
  calculatedAt: string;
}

export interface CreateMetricResultInput {
  metricDefinitionId: string;
  periodType: PeriodType;
  periodStart: Date | string;
  periodEnd: Date | string;
  dimensionValues?: Record<string, any>;
  numericValue: number;
  details?: Record<string, any> | null;
  calculationVersion?: number;
  calculationRunId?: string;
  calculatedAt?: Date | string;
}
