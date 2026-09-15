'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';
import { peopleApi, Person } from '../../../api/people.api';
import { useReviews } from './use-reviews';

export function useMentor(enrollmentId?: string) {
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const { reviews } = useReviews(enrollmentId);

  // 1. Query mentorship assignment for this student
  const {
    data: mentorAssignment = null,
    isLoading: isAssignmentLoading,
  } = useQuery({
    queryKey: ['student', 'mentor-assignment', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return null;

      // Find assignments where target is this student
      const targetAssignments = await assignmentsApi.listAssignments(orgId, {
        targetType: 'student',
        targetId: user.id,
        status: 'active',
      });
      if (targetAssignments.length > 0) {
        return targetAssignments[0];
      }

      // Fallback: check assignments of type mentorship
      const personAssignments = await assignmentsApi.getPersonAssignments(orgId, user.id);
      const mentorAssigned = personAssignments.find(
        (a) => a.targetType === 'mentor' || a.roleContext?.toLowerCase().includes('mentor')
      );
      return mentorAssigned || null;
    },
    enabled: Boolean(orgId && user?.id),
  });

  // 2. Resolve mentor Person ID
  const mentorPersonId =
    mentorAssignment?.targetType === 'student'
      ? mentorAssignment.personId
      : mentorAssignment?.targetType === 'mentor'
      ? mentorAssignment.targetId
      : reviews[0]?.reviewerPersonId || null;

  // 3. Fetch Mentor Person record
  const {
    data: mentorPerson = null,
    isLoading: isPersonLoading,
  } = useQuery({
    queryKey: ['student', 'mentor-person', orgId, mentorPersonId],
    queryFn: async () => {
      if (!orgId || !mentorPersonId) return null;
      try {
        return await peopleApi.getPerson(orgId, mentorPersonId);
      } catch {
        return null;
      }
    },
    enabled: Boolean(orgId && mentorPersonId),
  });

  // 4. Mentor's reviews for this student
  const mentorReviews = reviews.filter(
    (r) => !mentorPersonId || r.reviewerPersonId === mentorPersonId
  );

  return {
    mentorAssignment,
    mentorPerson,
    mentorReviews,
    hasMentor: Boolean(mentorPerson || mentorAssignment),
    isLoading: isAssignmentLoading || isPersonLoading,
  };
}
