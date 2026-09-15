import { apiClient } from './client';

export type EvaluationState = 'draft' | 'scheduled' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';
export type FeedbackType = 'text' | 'work_log' | 'meeting' | 'project' | 'learning_program';

export interface EvaluationFeedback {
  id: string;
  evaluationId: string;
  feedbackType: FeedbackType;
  payload: Record<string, any>;
  createdAt: string;
}

export interface Evaluation {
  id: string;
  organizationId: string;
  templateId: string;
  subjectId: string;
  evaluatorIds: string[];
  state: EvaluationState;
  scheduledAt?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  summaryFeedback?: string | null;
  feedback?: EvaluationFeedback[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const evaluationApi = {
  listEvaluations: async (
    orgId: string,
    params?: { subjectId?: string; evaluatorId?: string; state?: EvaluationState }
  ): Promise<Evaluation[]> => {
    return apiClient.get<Evaluation[]>('/evaluations', {
      organizationId: orgId,
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  getEvaluation: async (orgId: string, id: string): Promise<Evaluation> => {
    return apiClient.get<Evaluation>(`/evaluations/${id}`, { organizationId: orgId });
  },
};
