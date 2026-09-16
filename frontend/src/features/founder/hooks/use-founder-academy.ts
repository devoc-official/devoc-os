'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi } from '../../../api/learning.api';
import { financeApi } from '../../../api/finance.api';
import { peopleApi } from '../../../api/people.api';
import { assignmentsApi } from '../../../api/assignments.api';

export function useFounderAcademy() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: programs = [], isLoading: isProgramsLoading } = useQuery({
    queryKey: ['founder', 'academy-programs', orgId],
    queryFn: () => learningApi.listPrograms(orgId),
    enabled: Boolean(orgId),
  });

  const { data: enrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['founder', 'academy-enrollments', orgId],
    queryFn: () => learningApi.listEnrollments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['founder', 'academy-reviews', orgId],
    queryFn: () => learningApi.listReviews(orgId),
    enabled: Boolean(orgId),
  });

  const { data: people = [] } = useQuery({
    queryKey: ['founder', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['founder', 'academy-assignments', orgId],
    queryFn: () => assignmentsApi.listAssignments(orgId),
    enabled: Boolean(orgId),
  });

  // M9 Finance: Academy fee obligations
  const { data: obligations = [] } = useQuery({
    queryKey: ['founder', 'academy-obligations', orgId],
    queryFn: () => financeApi.listObligations(orgId, { direction: 'receivable' }),
    enabled: Boolean(orgId),
  });

  const peopleMap = new Map(people.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const programMap = new Map(programs.map((prog) => [prog.id, prog.name]));

  // Mentor assignments (assignment target is student or program)
  const mentorAssignments = assignments.filter(
    (a) => a.roleContext?.toLowerCase().includes('mentor') || a.assignmentType === 'mentor'
  );

  const totalFeeGross = obligations.reduce((sum, o) => sum + Number(o.grossAmount || 0), 0);
  const totalFeeCollected = obligations.reduce(
    (sum, o) => sum + (Number(o.grossAmount || 0) - Number(o.balanceAmount || 0)),
    0
  );
  const totalFeeOutstanding = obligations.reduce((sum, o) => sum + Number(o.balanceAmount || 0), 0);

  const activeStudents = enrollments.filter((e) => e.status === 'active');
  const completedStudents = enrollments.filter((e) => e.status === 'completed');

  return {
    programs,
    enrollments,
    activeStudents,
    completedStudents,
    reviews,
    people,
    peopleMap,
    programMap,
    mentorAssignments,
    obligations,
    totalFeeGross,
    totalFeeCollected,
    totalFeeOutstanding,
    isLoading: isProgramsLoading || isEnrollmentsLoading,
  };
}
