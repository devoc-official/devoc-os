'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { useRole } from '../../../roles/role.context';
import {
  learningApi,
  LearningEnrollment,
  EnrollmentMilestone,
  LearningActivity,
} from '../../../api/learning.api';

export function useEnrollment() {
  const queryClient = useQueryClient();
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId;

  // Find current person from RoleContext or query
  const { currentRole } = useRole();
  const { user } = useAuth();

  // 1. Fetch person enrollments
  const {
    data: enrollments = [],
    isLoading: isEnrollmentsLoading,
    isError: isEnrollmentsError,
    refetch: refetchEnrollments,
  } = useQuery({
    queryKey: ['student', 'enrollments', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return [];
      // Pass user.id which in our architecture matches person.userId or person.id
      return learningApi.listPersonEnrollments(orgId, user.id);
    },
    enabled: Boolean(orgId && user?.id),
  });

  // Distinguish Active vs Historical
  const activeEnrollment =
    enrollments.find((e) => e.status === 'active') ||
    enrollments.find((e) => e.status === 'pending') ||
    enrollments[0] ||
    null;

  const historicalEnrollments = enrollments.filter(
    (e) => e.id !== activeEnrollment?.id
  );

  // 2. Fetch program details for active enrollment
  const { data: activeProgram = null, isLoading: isProgramLoading } = useQuery({
    queryKey: ['student', 'program', orgId, activeEnrollment?.learningProgramId],
    queryFn: async () => {
      if (!orgId || !activeEnrollment?.learningProgramId) return null;
      return learningApi.getProgramById(orgId, activeEnrollment.learningProgramId);
    },
    enabled: Boolean(orgId && activeEnrollment?.learningProgramId),
  });

  // 3. Fetch personalized milestones
  const {
    data: milestones = [],
    isLoading: isMilestonesLoading,
    refetch: refetchMilestones,
  } = useQuery({
    queryKey: ['student', 'milestones', orgId, activeEnrollment?.id],
    queryFn: async () => {
      if (!orgId || !activeEnrollment?.id) return [];
      const list = await learningApi.listEnrollmentMilestones(orgId, activeEnrollment.id);
      return list.sort((a, b) => a.sequence - b.sequence);
    },
    enabled: Boolean(orgId && activeEnrollment?.id),
  });

  // 4. Fetch personalized activities
  const {
    data: activities = [],
    isLoading: isActivitiesLoading,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ['student', 'activities', orgId, activeEnrollment?.id],
    queryFn: async () => {
      if (!orgId || !activeEnrollment?.id) return [];
      const list = await learningApi.listEnrollmentActivities(orgId, activeEnrollment.id);
      return list.sort((a, b) => a.sequence - b.sequence);
    },
    enabled: Boolean(orgId && activeEnrollment?.id),
  });

  // Mutations
  const completeActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (!orgId) throw new Error('No organization context');
      return learningApi.completeActivity(orgId, activityId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'activities'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'milestones'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'enrollments'] });
    },
  });

  const skipActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (!orgId) throw new Error('No organization context');
      return learningApi.skipActivity(orgId, activityId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'activities'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'milestones'] });
    },
  });

  return {
    enrollments,
    activeEnrollment,
    historicalEnrollments,
    activeProgram,
    milestones,
    activities,
    isLoading: isEnrollmentsLoading || isProgramLoading || isMilestonesLoading || isActivitiesLoading,
    isError: isEnrollmentsError,
    completeActivity: completeActivityMutation.mutateAsync,
    isCompletingActivity: completeActivityMutation.isPending,
    skipActivity: skipActivityMutation.mutateAsync,
    isSkippingActivity: skipActivityMutation.isPending,
    refetchAll: async () => {
      await Promise.all([refetchEnrollments(), refetchMilestones(), refetchActivities()]);
    },
  };
}
