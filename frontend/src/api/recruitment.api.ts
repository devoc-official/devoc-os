import { apiClient } from './client';

export type PositionStatus = 'draft' | 'open' | 'paused' | 'closed' | 'archived';
export type ApplicationStatus = 'applied' | 'in_review' | 'assessment' | 'interview' | 'trial' | 'offered' | 'hired' | 'rejected' | 'withdrawn';

export interface Position {
  id: string;
  organizationId: string;
  title: string;
  code: string;
  description?: string | null;
  departmentId?: string | null;
  businessUnitId?: string | null;
  employmentType: string;
  openingsCount: number;
  hiringManagerId?: string | null;
  status: PositionStatus;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  resumeUrl?: string | null;
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  organizationId: string;
  name: string;
  sequence: number;
  stageType: string;
  isSystemDefault: boolean;
}

export interface Application {
  id: string;
  organizationId: string;
  positionId: string;
  candidateId: string;
  currentStageId?: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  decidedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const recruitmentApi = {
  listPositions: async (organizationId: string, params?: { status?: string }): Promise<Position[]> => {
    return apiClient.get<Position[]>(`/organizations/${organizationId}/recruitment/positions`, { params });
  },

  getPosition: async (organizationId: string, positionId: string): Promise<Position> => {
    return apiClient.get<Position>(`/organizations/${organizationId}/recruitment/positions/${positionId}`);
  },

  createPosition: async (organizationId: string, payload: Partial<Position>): Promise<Position> => {
    return apiClient.post<Position>(`/organizations/${organizationId}/recruitment/positions`, payload);
  },

  openPosition: async (organizationId: string, positionId: string): Promise<Position> => {
    return apiClient.post<Position>(`/organizations/${organizationId}/recruitment/positions/${positionId}/open`, {});
  },

  pausePosition: async (organizationId: string, positionId: string): Promise<Position> => {
    return apiClient.post<Position>(`/organizations/${organizationId}/recruitment/positions/${positionId}/pause`, {});
  },

  closePosition: async (organizationId: string, positionId: string): Promise<Position> => {
    return apiClient.post<Position>(`/organizations/${organizationId}/recruitment/positions/${positionId}/close`, {});
  },

  listCandidates: async (organizationId: string): Promise<Candidate[]> => {
    return apiClient.get<Candidate[]>(`/organizations/${organizationId}/recruitment/candidates`);
  },

  getCandidate: async (organizationId: string, candidateId: string): Promise<Candidate> => {
    return apiClient.get<Candidate>(`/organizations/${organizationId}/recruitment/candidates/${candidateId}`);
  },

  createCandidate: async (organizationId: string, payload: Partial<Candidate>): Promise<Candidate> => {
    return apiClient.post<Candidate>(`/organizations/${organizationId}/recruitment/candidates`, payload);
  },

  listPipelineStages: async (organizationId: string): Promise<PipelineStage[]> => {
    return apiClient.get<PipelineStage[]>(`/organizations/${organizationId}/recruitment/stages`);
  },

  listApplications: async (
    organizationId: string,
    params?: { positionId?: string; status?: string }
  ): Promise<Application[]> => {
    return apiClient.get<Application[]>(`/organizations/${organizationId}/recruitment/applications`, { params });
  },

  getApplication: async (organizationId: string, applicationId: string): Promise<Application> => {
    return apiClient.get<Application>(`/organizations/${organizationId}/recruitment/applications/${applicationId}`);
  },

  advanceApplication: async (
    organizationId: string,
    applicationId: string,
    payload: { targetStageId: string; feedback?: string }
  ): Promise<Application> => {
    return apiClient.post<Application>(`/organizations/${organizationId}/recruitment/applications/${applicationId}/advance`, payload);
  },

  rejectApplication: async (
    organizationId: string,
    applicationId: string,
    reason: string
  ): Promise<Application> => {
    return apiClient.post<Application>(`/organizations/${organizationId}/recruitment/applications/${applicationId}/reject`, { reason });
  },

  hireCandidate: async (
    organizationId: string,
    applicationId: string,
    payload: { jobTitle: string; employmentType: string; startDate: string }
  ): Promise<{ personId: string; employmentId: string }> => {
    return apiClient.post<{ personId: string; employmentId: string }>(
      `/organizations/${organizationId}/recruitment/applications/${applicationId}/hire`,
      payload
    );
  },
};
