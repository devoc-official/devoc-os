import { apiClient } from './client';

export type WorkStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';

export interface WorkCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

export interface WorkRecord {
  id: string;
  organizationId: string;
  personId: string;
  targetType?: string | null;
  targetId?: string | null;
  assignmentId?: string | null;
  categoryId: string;
  title: string;
  description?: string | null;
  status: WorkStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMinutes: number;
  createdByPersonId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkEvidence {
  id: string;
  workId: string;
  title: string;
  evidenceUrl?: string | null;
  description?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface WorkOutcome {
  id: string;
  workId: string;
  title: string;
  description?: string | null;
  status: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export const workApi = {
  listCategories: async (orgId: string): Promise<WorkCategory[]> => {
    return apiClient.get<WorkCategory[]>('/work-categories', { organizationId: orgId });
  },

  listWorkRecords: async (
    orgId: string,
    params?: { personId?: string; targetType?: string; targetId?: string; status?: WorkStatus }
  ): Promise<WorkRecord[]> => {
    return apiClient.get<WorkRecord[]>('/work', {
      organizationId: orgId,
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  getWorkRecord: async (orgId: string, workId: string): Promise<WorkRecord> => {
    return apiClient.get<WorkRecord>(`/work/${workId}`, { organizationId: orgId });
  },

  listEvidence: async (orgId: string, workId: string): Promise<WorkEvidence[]> => {
    return apiClient.get<WorkEvidence[]>(`/work/${workId}/evidence`, { organizationId: orgId });
  },

  listOutcomes: async (orgId: string, workId: string): Promise<WorkOutcome[]> => {
    return apiClient.get<WorkOutcome[]>(`/work/${workId}/outcomes`, { organizationId: orgId });
  },
};
