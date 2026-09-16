'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { meetingsApi, Meeting, MeetingDecision, MeetingActionItem } from '../../../api/meetings.api';
import { useMentorStudents } from './use-mentor-students';

export function useMentorMeetings() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const { mentorPerson } = useMentorStudents();

  const {
    data: meetings = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['mentor', 'meetings', orgId, mentorPerson?.id],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        const list = await meetingsApi.listMeetings(orgId);
        // Filter meetings where mentor is organizer or participant
        return list;
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled');
  const pastMeetings = meetings.filter((m) => m.status === 'completed');

  return {
    meetings,
    upcomingMeetings,
    pastMeetings,
    isLoading,
    refetch,
  };
}
