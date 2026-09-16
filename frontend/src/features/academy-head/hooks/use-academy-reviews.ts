'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningReview } from '../../../api/learning.api';
import { peopleApi, Person } from '../../../api/people.api';

export function useAcademyReviews() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: reviews = [], isLoading: isReviewsLoading } = useQuery({
    queryKey: ['ah', 'reviews', orgId],
    queryFn: () => learningApi.listReviews(orgId),
    enabled: Boolean(orgId),
  });

  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['ah', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: enrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['ah', 'enrollments', orgId],
    queryFn: () => learningApi.listEnrollments(orgId),
    enabled: Boolean(orgId),
  });

  const peopleMap = new Map(people.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  const enrollmentStudentMap = new Map<string, string>();
  for (const e of enrollments) {
    const sName = peopleMap.get(e.personId) || `Student #${e.personId.slice(0, 8)}`;
    enrollmentStudentMap.set(e.id, sName);
  }

  return {
    reviews,
    peopleMap,
    enrollmentStudentMap,
    isLoading: isReviewsLoading || isPeopleLoading || isEnrollmentsLoading,
  };
}
