'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { peopleApi, Person } from '../../../api/people.api';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';
import { learningApi, LearningReview } from '../../../api/learning.api';

export interface MentorWorkloadInfo {
  mentor: Person;
  activeAssignments: Assignment[];
  assignedStudentIds: string[];
  totalCapacityHours: number;
  completedReviewsCount: number;
  pendingReviewsCount: number;
}

export function useAcademyMentors() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['ah', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['ah', 'assignments', orgId],
    queryFn: () => assignmentsApi.listAssignments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: reviews = [], isLoading: isReviewsLoading } = useQuery({
    queryKey: ['ah', 'reviews', orgId],
    queryFn: () => learningApi.listReviews(orgId),
    enabled: Boolean(orgId),
  });

  const peopleMap = new Map(people.map((p) => [p.id, p]));

  // Mentor assignments
  const mentorAssignments = assignments.filter(
    (a) =>
      a.status === 'active' &&
      (a.roleContext?.toLowerCase().includes('mentor') || a.assignmentType === 'mentor')
  );

  // Group by mentor personId
  const mentorMap = new Map<string, Assignment[]>();
  for (const a of mentorAssignments) {
    const list = mentorMap.get(a.personId) || [];
    list.push(a);
    mentorMap.set(a.personId, list);
  }

  const mentorWorkloads: MentorWorkloadInfo[] = [];

  for (const [personId, asgs] of mentorMap.entries()) {
    const mentor = peopleMap.get(personId);
    if (!mentor) continue;

    const assignedStudentIds = asgs
      .filter((a) => a.targetType === 'student')
      .map((a) => a.targetId);

    const totalCapacityHours = asgs.reduce(
      (sum, a) => sum + (a.capacityUnit === 'hours_per_week' ? Number(a.capacityValue || 0) : 0),
      0
    );

    const mentorReviews = reviews.filter((r) => r.reviewerPersonId === personId);
    const completedReviewsCount = mentorReviews.length;
    const pendingReviewsCount = assignedStudentIds.length > completedReviewsCount ? assignedStudentIds.length - completedReviewsCount : 0;

    mentorWorkloads.push({
      mentor,
      activeAssignments: asgs,
      assignedStudentIds,
      totalCapacityHours,
      completedReviewsCount,
      pendingReviewsCount,
    });
  }

  return {
    mentorWorkloads,
    isLoading: isPeopleLoading || isAssignmentsLoading || isReviewsLoading,
  };
}
