import { apiClient } from './client';

export interface AnalyticsMetric {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  category: string;
  aggregationType: string;
  unit?: string | null;
  status: 'active' | 'archived';
}

export interface MetricComputationResult {
  metricId: string;
  metricCode: string;
  value: number;
  periodStart: string;
  periodEnd: string;
  timestamp: string;
}

export const analyticsApi = {
  listMetrics: async (organizationId: string): Promise<AnalyticsMetric[]> => {
    return apiClient.get<AnalyticsMetric[]>('/analytics/metrics', { organizationId });
  },

  getMetric: async (organizationId: string, metricId: string): Promise<AnalyticsMetric> => {
    return apiClient.get<AnalyticsMetric>(`/analytics/metrics/${metricId}`, { organizationId });
  },

  computeMetric: async (
    organizationId: string,
    metricId: string,
    period?: { startDate?: string; endDate?: string }
  ): Promise<MetricComputationResult> => {
    return apiClient.post<MetricComputationResult>(
      `/analytics/metrics/${metricId}/compute`,
      period,
      { organizationId }
    );
  },

  listReports: async (organizationId: string): Promise<any[]> => {
    return apiClient.get<any[]>('/analytics/reports', { organizationId });
  },
};
