'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import {
  learningApi,
  LearningEnrollment,
  LearningProgram,
  EnrollmentMilestone,
  LearningActivity,
  LearningReview,
  ReviewChange,
  Assessment,
  AssessmentAttempt,
} from '../../../api/learning.api';
import { peopleApi, Person } from '../../../api/people.api';
import { projectsApi, Project, Task } from '../../../api/projects.api';
import { workApi, WorkRecord } from '../../../api/work.api';
import { StudentSuggestion } from '../../student/types/student.types';
import { ReviewFormData } from '../components/review-form';

export function useReviewWorkspace(enrollmentId?: string, reviewId?: string) {
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const queryClient = useQueryClient();

  // 1. Resolve Reviewer Person
  const { data: reviewerPerson = null } = useQuery({
    queryKey: ['reviewer', 'person', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return null;
      const people = await peopleApi.listPeople(orgId);
      return people.find((p) => p.userId === user.id || p.email.toLowerCase() === user.email.toLowerCase()) || null;
    },
    enabled: Boolean(orgId && user),
  });

  // 2. Resolve Master Workspace Context
  const {
    data: workspace = null,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['reviewer', 'workspace-context', orgId, enrollmentId, reviewId],
    queryFn: async () => {
      if (!orgId || !enrollmentId) return null;

      // Fetch Enrollment
      const enrollment = await learningApi.getEnrollmentById(orgId, enrollmentId);
      if (!enrollment) return null;

      // Concurrently fetch Program, Student Person, Milestones, Activities, Reviews, Projects, Assessments
      const [program, student, milestones, activities, reviews, assessments] = await Promise.all([
        learningApi.getProgramById(orgId, enrollment.learningProgramId).catch(() => null),
        peopleApi.getPerson(orgId, enrollment.personId).catch(() => null),
        learningApi.listEnrollmentMilestones(orgId, enrollment.id).catch(() => [] as EnrollmentMilestone[]),
        learningApi.listEnrollmentActivities(orgId, enrollment.id).catch(() => [] as LearningActivity[]),
        learningApi.listReviews(orgId, enrollment.id).catch(() => [] as LearningReview[]),
        learningApi.listAssessments(orgId, enrollment.id).catch(() => [] as Assessment[]),
      ]);

      if (!student || !program) return null;

      // Identify current active milestone & in-progress activity
      const currentMilestone = milestones.find((m) => m.status === 'active') || milestones[0] || null;
      const currentActivity =
        activities.find((a) => a.enrollmentMilestoneId === currentMilestone?.id && a.status === 'active') ||
        activities.find((a) => a.enrollmentMilestoneId === currentMilestone?.id) ||
        activities[0] ||
        null;

      // Prior Review (the most recent completed review, or specific reviewId)
      let targetReview: LearningReview | null = null;
      let previousReview: LearningReview | null = null;

      if (reviewId) {
        targetReview = reviews.find((r) => r.id === reviewId) || null;
        const targetIndex = reviews.findIndex((r) => r.id === reviewId);
        previousReview = reviews[targetIndex + 1] || null;
      } else {
        previousReview = reviews[0] || null;
      }

      // Review Changes for the prior review
      let reviewChanges: ReviewChange[] = [];
      if (previousReview) {
        reviewChanges = await learningApi.listReviewChanges(orgId, enrollment.id, previousReview.id).catch(() => []);
      }

      // Actionable Suggestions extracted from previous review metadata
      const previousSuggestions: StudentSuggestion[] = [];
      if (previousReview) {
        const sugs = (previousReview.metadata as any)?.suggestions;
        if (Array.isArray(sugs)) {
          sugs.forEach((sugText: string, i: number) => {
            previousSuggestions.push({
              id: `prev-sug-${previousReview!.id}-${i}`,
              text: sugText,
              status: 'open',
              sourceType: 'review',
              sourceId: previousReview!.id,
              reviewerName: 'Previous Reviewer',
              requiredAction: 'Verify implementation in current review',
              createdAt: previousReview!.reviewedAt,
            });
          });
        }
      }

      // Student Evidence (Projects, Tasks, Work Records)
      let projects: Project[] = [];
      let tasks: Task[] = [];
      let workRecords: WorkRecord[] = [];

      try {
        const allProjects = await projectsApi.listProjects(orgId);
        projects = allProjects.slice(0, 3);
        if (projects.length > 0) {
          tasks = await projectsApi.listProjectTasks(orgId, projects[0].id).catch(() => []);
        }
        workRecords = await workApi.listWorkRecords(orgId, { personId: student.id }).catch(() => []);
      } catch {
        // graceful fallback if optional modules return empty
      }

      return {
        student,
        enrollment,
        program,
        milestones,
        currentMilestone,
        currentActivity,
        previousReview,
        targetReview,
        previousSuggestions,
        reviewChanges,
        currentEvidence: {
          projects,
          tasks,
          workRecords,
        },
        assessments,
        attempts: [] as AssessmentAttempt[],
      };
    },
    enabled: Boolean(orgId && enrollmentId),
  });

  // Submit Review Mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (formData: ReviewFormData) => {
      if (!orgId || !enrollmentId || !reviewerPerson) {
        throw new Error('Missing review submission context');
      }

      // 1. Create authoritative M7 Learning Review
      const review = await learningApi.createReview(orgId, enrollmentId, {
        reviewerPersonId: reviewerPerson.id,
        reviewType: 'progression_evaluation',
        summary: formData.summary,
        feedback: formData.feedback,
        progressValue: formData.progressValue,
        metadata: {
          decision: formData.decision,
          suggestions: formData.suggestions,
        },
      });

      // 2. If reviewer specified a roadmap change, record ReviewChange and apply milestone transition
      if (formData.roadmapAction !== 'none' && formData.selectedMilestoneId) {
        const changeType = formData.roadmapAction;
        await learningApi.addReviewChange(orgId, enrollmentId, review.id, {
          changeType,
          targetType: 'milestone',
          targetId: formData.selectedMilestoneId,
          reason: `Reviewer progression decision: ${formData.decision}`,
        });

        if (changeType === 'complete_milestone') {
          await learningApi.completeMilestone(orgId, enrollmentId, formData.selectedMilestoneId);
        } else if (changeType === 'skip_milestone') {
          await learningApi.skipMilestone(orgId, enrollmentId, formData.selectedMilestoneId);
        }
      }

      return review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewer'] });
      queryClient.invalidateQueries({ queryKey: ['mentor'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
    },
  });

  return {
    reviewerPerson,
    workspace,
    isLoading,
    submitReview: submitReviewMutation.mutateAsync,
    isSubmitting: submitReviewMutation.isPending,
    refetch,
  };
}
