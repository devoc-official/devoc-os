'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningEnrollment, LearningProgram } from '../../../api/learning.api';
import { peopleApi, Person } from '../../../api/people.api';
import { projectsApi, Project } from '../../../api/projects.api';

export interface PlacementReadinessCandidate {
  student: Person;
  program: LearningProgram | null;
  enrollmentStatus: string;
  isCourseCompleted: boolean;
  completedAt: string | null;
}

export function useAcademyPlacement() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['ah', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

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

  const { data: projects = [] } = useQuery({
    queryKey: ['ah', 'projects', orgId],
    queryFn: () => projectsApi.listProjects(orgId),
    enabled: Boolean(orgId),
  });

  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const programMap = new Map(programs.map((p) => [p.id, p]));

  // Completed graduates readiness
  const completedCandidates: PlacementReadinessCandidate[] = enrollments
    .filter((e) => e.status === 'completed')
    .map((e) => {
      const student = peopleMap.get(e.personId) || {
        id: e.personId,
        firstName: 'Student',
        lastName: `#${e.personId.slice(0, 6)}`,
        email: '',
      } as Person;

      return {
        student,
        program: programMap.get(e.learningProgramId) || null,
        enrollmentStatus: e.status,
        isCourseCompleted: true,
        completedAt: e.completedAt || null,
      };
    });

  return {
    completedCandidates,
    totalCompletedGraduates: completedCandidates.length,
    isLoading: isPeopleLoading || isProgramsLoading || isEnrollmentsLoading,
  };
}
