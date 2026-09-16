import { apiClient } from './client';

export type EnrollmentStatus = 'pending' | 'active' | 'paused' | 'completed' | 'withdrawn' | 'cancelled';
export type RoadmapItemStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface LearningProgram {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  status: 'draft' | 'active' | 'archived';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface LearningEnrollment {
  id: string;
  organizationId: string;
  personId: string;
  learningProgramId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  startedAt?: string | null;
  expectedEndAt?: string | null;
  completedAt?: string | null;
  withdrawnAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentMilestone {
  id: string;
  organizationId: string;
  enrollmentId: string;
  sourceMilestoneId?: string | null;
  title: string;
  description?: string | null;
  sequence: number;
  status: RoadmapItemStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface LearningActivity {
  id: string;
  organizationId: string;
  enrollmentMilestoneId: string;
  sourceActivityId?: string | null;
  title: string;
  description?: string | null;
  activityType: string;
  sequence: number;
  status: RoadmapItemStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface LearningActivityReference {
  id: string;
  organizationId: string;
  learningActivityId: string;
  referenceType: 'project' | 'task';
  referenceId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface LearningReview {
  id: string;
  organizationId: string;
  enrollmentId: string;
  reviewerPersonId: string;
  reviewType: string;
  reviewedAt: string;
  summary: string;
  feedback?: string | null;
  progressValue?: number | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewChange {
  id: string;
  organizationId: string;
  reviewId: string;
  changeType: string;
  targetType: string;
  targetId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Assessment {
  id: string;
  organizationId: string;
  enrollmentId: string;
  learningActivityId?: string | null;
  title: string;
  description?: string | null;
  maxScore: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAttempt {
  id: string;
  organizationId: string;
  assessmentId: string;
  personId: string;
  attemptNumber: number;
  score?: number | null;
  passed?: boolean | null;
  status: 'started' | 'submitted' | 'completed';
  submittedAt: string;
  completedAt?: string | null;
  feedback?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const learningApi = {
  // Programs
  listPrograms: async (orgId: string): Promise<LearningProgram[]> => {
    return apiClient.get<LearningProgram[]>(`/organizations/${orgId}/learning-programs`, { organizationId: orgId });
  },

  getProgramById: async (orgId: string, programId: string): Promise<LearningProgram> => {
    return apiClient.get<LearningProgram>(`/organizations/${orgId}/learning-programs/${programId}`, { organizationId: orgId });
  },

  // Enrollments
  listEnrollments: async (orgId: string): Promise<LearningEnrollment[]> => {
    return apiClient.get<LearningEnrollment[]>(`/organizations/${orgId}/learning-enrollments`, { organizationId: orgId });
  },

  listPersonEnrollments: async (orgId: string, personId: string): Promise<LearningEnrollment[]> => {
    return apiClient.get<LearningEnrollment[]>(`/organizations/${orgId}/people/${personId}/learning-enrollments`, { organizationId: orgId });
  },

  getEnrollmentById: async (orgId: string, enrollmentId: string): Promise<LearningEnrollment> => {
    return apiClient.get<LearningEnrollment>(`/organizations/${orgId}/learning-enrollments/${enrollmentId}`, { organizationId: orgId });
  },

  // Personalized Roadmap Milestones & Activities
  listEnrollmentMilestones: async (orgId: string, enrollmentId: string): Promise<EnrollmentMilestone[]> => {
    return apiClient.get<EnrollmentMilestone[]>(`/organizations/${orgId}/learning-enrollments/${enrollmentId}/milestones`, { organizationId: orgId });
  },

  activateMilestone: async (orgId: string, enrollmentId: string, milestoneId: string): Promise<EnrollmentMilestone> => {
    return apiClient.post<EnrollmentMilestone>(
      `/organizations/${orgId}/learning-enrollments/${enrollmentId}/milestones/${milestoneId}/activate`,
      {},
      { organizationId: orgId }
    );
  },

  completeMilestone: async (orgId: string, enrollmentId: string, milestoneId: string): Promise<EnrollmentMilestone> => {
    return apiClient.post<EnrollmentMilestone>(
      `/organizations/${orgId}/learning-enrollments/${enrollmentId}/milestones/${milestoneId}/complete`,
      {},
      { organizationId: orgId }
    );
  },

  skipMilestone: async (orgId: string, enrollmentId: string, milestoneId: string): Promise<EnrollmentMilestone> => {
    return apiClient.post<EnrollmentMilestone>(
      `/organizations/${orgId}/learning-enrollments/${enrollmentId}/milestones/${milestoneId}/skip`,
      {},
      { organizationId: orgId }
    );
  },

  listEnrollmentActivities: async (orgId: string, enrollmentId: string): Promise<LearningActivity[]> => {
    return apiClient.get<LearningActivity[]>(`/organizations/${orgId}/learning-enrollments/${enrollmentId}/activities`, { organizationId: orgId });
  },

  completeActivity: async (orgId: string, activityId: string): Promise<LearningActivity> => {
    return apiClient.post<LearningActivity>(`/organizations/${orgId}/learning-activities/${activityId}/complete`, {}, { organizationId: orgId });
  },

  skipActivity: async (orgId: string, activityId: string): Promise<LearningActivity> => {
    return apiClient.post<LearningActivity>(`/organizations/${orgId}/learning-activities/${activityId}/skip`, {}, { organizationId: orgId });
  },

  addActivityReference: async (
    orgId: string,
    activityId: string,
    ref: { referenceType: 'project' | 'task'; referenceId: string; metadata?: Record<string, any> }
  ): Promise<LearningActivityReference> => {
    return apiClient.post<LearningActivityReference>(`/organizations/${orgId}/learning-activities/${activityId}/references`, ref, { organizationId: orgId });
  },

  // Reviews
  listReviews: async (orgId: string, enrollmentId?: string): Promise<LearningReview[]> => {
    if (enrollmentId) {
      return apiClient.get<LearningReview[]>(`/organizations/${orgId}/learning-enrollments/${enrollmentId}/reviews`, { organizationId: orgId });
    }
    const enrollments = await apiClient.get<LearningEnrollment[]>(`/organizations/${orgId}/learning-enrollments`, { organizationId: orgId }).catch(() => []);
    const reviewsByEnrollment = await Promise.all(
      enrollments.map((e) =>
        apiClient.get<LearningReview[]>(`/organizations/${orgId}/learning-enrollments/${e.id}/reviews`, { organizationId: orgId }).catch(() => [])
      )
    );
    return reviewsByEnrollment.flat();
  },

  getReviewById: async (orgId: string, enrollmentId: string, reviewId: string): Promise<LearningReview> => {
    return apiClient.get<LearningReview>(`/organizations/${orgId}/learning-enrollments/${enrollmentId}/reviews/${reviewId}`, { organizationId: orgId });
  },

  createReview: async (
    orgId: string,
    enrollmentId: string,
    payload: {
      reviewerPersonId: string;
      reviewType?: string;
      reviewedAt?: string;
      summary: string;
      feedback?: string;
      progressValue?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<LearningReview> => {
    return apiClient.post<LearningReview>(
      `/organizations/${orgId}/learning-enrollments/${enrollmentId}/reviews`,
      payload,
      { organizationId: orgId }
    );
  },

  addReviewChange: async (
    orgId: string,
    enrollmentId: string,
    reviewId: string,
    payload: {
      changeType: string;
      targetType: string;
      targetId: string;
      previousValue?: any;
      newValue?: any;
      reason?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<ReviewChange> => {
    return apiClient.post<ReviewChange>(
      `/organizations/${orgId}/learning-enrollments/${enrollmentId}/reviews/${reviewId}/changes`,
      payload,
      { organizationId: orgId }
    );
  },

  listReviewChanges: async (orgId: string, enrollmentId: string, reviewId: string): Promise<ReviewChange[]> => {
    return apiClient.get<ReviewChange[]>(`/organizations/${orgId}/learning-enrollments/${enrollmentId}/reviews/${reviewId}/changes`, { organizationId: orgId });
  },

  // Assessments
  listAssessments: async (orgId: string, enrollmentId: string): Promise<Assessment[]> => {
    return apiClient.get<Assessment[]>(`/organizations/${orgId}/learning-enrollments/${enrollmentId}/assessments`, { organizationId: orgId });
  },

  getAssessmentById: async (orgId: string, assessmentId: string): Promise<Assessment> => {
    return apiClient.get<Assessment>(`/organizations/${orgId}/assessments/${assessmentId}`, { organizationId: orgId });
  },

  submitAttempt: async (
    orgId: string,
    assessmentId: string,
    payload: { personId: string; metadata?: Record<string, any> }
  ): Promise<AssessmentAttempt> => {
    return apiClient.post<AssessmentAttempt>(`/organizations/${orgId}/assessments/${assessmentId}/attempts`, payload, { organizationId: orgId });
  },

  listAttempts: async (orgId: string, assessmentId: string): Promise<AssessmentAttempt[]> => {
    return apiClient.get<AssessmentAttempt[]>(`/organizations/${orgId}/assessments/${assessmentId}/attempts`, { organizationId: orgId });
  },

  completeAttempt: async (
    orgId: string,
    attemptId: string,
    result: { score: number; passed: boolean; feedback?: string }
  ): Promise<AssessmentAttempt> => {
    return apiClient.post<AssessmentAttempt>(`/organizations/${orgId}/assessment-attempts/${attemptId}/complete`, result, { organizationId: orgId });
  },
};
