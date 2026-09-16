import { apiClient } from './client';

export type AssignmentStatus = 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CapacityType = 'allocation' | 'workload';

export interface Assignment {
  id: string;
  organizationId: string;
  personId: string;
  targetType: string;
  targetId: string;
  assignmentType: string;
  roleContext?: string | null;
  status: AssignmentStatus;
  startAt: string;
  endAt?: string | null;
  capacityType: CapacityType;
  capacityValue: number;
  capacityUnit: string;
  authorityType: string;
  assignedByPersonId?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ListAssignmentsParams {
  personId?: string;
  targetType?: string;
  targetId?: string;
  status?: AssignmentStatus;
}

export const assignmentsApi = {
  listAssignments: async (orgId: string, params?: ListAssignmentsParams): Promise<Assignment[]> => {
    return apiClient.get<Assignment[]>('/assignments', {
      organizationId: orgId,
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  getAssignment: async (orgId: string, assignmentId: string): Promise<Assignment> => {
    return apiClient.get<Assignment>(`/assignments/${assignmentId}`, { organizationId: orgId });
  },

  getPersonAssignments: async (orgId: string, personId: string): Promise<Assignment[]> => {
    return apiClient.get<Assignment[]>(`/people/${personId}/assignments`, { organizationId: orgId });
  },

  createAssignment: async (orgId: string, payload: Partial<Assignment>): Promise<Assignment> => {
    return apiClient.post<Assignment>('/assignments', payload, { organizationId: orgId });
  },

  updateAssignment: async (orgId: string, assignmentId: string, payload: Partial<Assignment>): Promise<Assignment> => {
    return apiClient.patch<Assignment>(`/assignments/${assignmentId}`, payload, { organizationId: orgId });
  },
};
