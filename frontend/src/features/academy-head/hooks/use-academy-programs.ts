'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningProgram, LearningEnrollment } from '../../../api/learning.api';

export function useAcademyPrograms() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: programs = [], isLoading: isProgramsLoading } = useQuery({
    queryKey: ['ah', 'programs', orgId],
    queryFn: () => learningApi.listPrograms(orgId),
    enabled: Boolean(orgId),
  });

  const { data: enrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['ah', 'enrollments', orgId],
    queryFn: () => learningApi.listEnrollments(orgId),
    enabled: Boolean(orgId),
  });

  const programStats = programs.map((p) => {
    const pEnrollments = enrollments.filter((e) => e.learningProgramId === p.id);
    const active = pEnrollments.filter((e) => e.status === 'active').length;
    const completed = pEnrollments.filter((e) => e.status === 'completed').length;
    const paused = pEnrollments.filter((e) => e.status === 'paused').length;

    return {
      program: p,
      totalEnrolled: pEnrollments.length,
      activeCount: active,
      completedCount: completed,
      pausedCount: paused,
    };
  });

  return {
    programs,
    programStats,
    isLoading: isProgramsLoading || isEnrollmentsLoading,
  };
}
