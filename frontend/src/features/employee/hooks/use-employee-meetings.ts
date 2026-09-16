'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { meetingsApi, Meeting, MeetingActionItem, MeetingDecision } from '../../../api/meetings.api';

export function useEmployeeMeetings() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.organizationId;

  const {
    data: meetings = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['employee', 'meetings-full', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await meetingsApi.listMeetings(orgId);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled' || m.status === 'in_progress');
  const pastMeetings = meetings.filter((m) => m.status === 'completed' || m.status === 'cancelled');

  const getMeetingDetails = async (meetingId: string) => {
    if (!orgId) return { decisions: [], actionItems: [] };
    const [decisions, actionItems] = await Promise.all([
      meetingsApi.listDecisions(orgId, meetingId).catch(() => []),
      meetingsApi.listActionItems(orgId, meetingId).catch(() => []),
    ]);
    return { decisions, actionItems };
  };

  return {
    meetings,
    upcomingMeetings,
    pastMeetings,
    isLoading,
    getMeetingDetails,
    refetch,
  };
}
