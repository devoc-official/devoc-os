import { apiClient } from './client';

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ActionItemStatus = 'open' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  meetingTypeId: string;
  status: MeetingStatus;
  scheduledStartAt: string;
  scheduledEndAt: string;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  locationType?: string | null;
  locationReference?: string | null;
  organizerPersonId: string;
  createdByPersonId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingDecision {
  id: string;
  organizationId: string;
  meetingId: string;
  title: string;
  decisionText: string;
  decidedAt: string;
  recordedByPersonId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MeetingActionItem {
  id: string;
  organizationId: string;
  meetingId: string;
  title: string;
  description?: string | null;
  ownerPersonId?: string | null;
  dueAt?: string | null;
  status: ActionItemStatus;
  taskId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MeetingParticipant {
  id: string;
  organizationId: string;
  meetingId: string;
  personId: string;
  participantType: string;
  responseStatus: string;
}

export interface MeetingAgendaItem {
  id: string;
  organizationId: string;
  meetingId: string;
  title: string;
  description?: string | null;
  position: number;
  ownerPersonId?: string | null;
  durationMinutes?: number | null;
  status: string;
}

export const meetingsApi = {
  listMeetings: async (orgId: string, params?: { status?: MeetingStatus; organizerPersonId?: string }): Promise<Meeting[]> => {
    return apiClient.get<Meeting[]>(`/organizations/${orgId}/meetings`, { organizationId: orgId, params });
  },

  getMeetingById: async (orgId: string, meetingId: string): Promise<Meeting> => {
    return apiClient.get<Meeting>(`/meetings/${meetingId}`, { organizationId: orgId });
  },

  createMeeting: async (orgId: string, payload: Partial<Meeting>): Promise<Meeting> => {
    return apiClient.post<Meeting>(`/organizations/${orgId}/meetings`, payload, { organizationId: orgId });
  },

  listParticipants: async (orgId: string, meetingId: string): Promise<MeetingParticipant[]> => {
    return apiClient.get<MeetingParticipant[]>(`/meetings/${meetingId}/participants`, { organizationId: orgId });
  },

  listAgendaItems: async (orgId: string, meetingId: string): Promise<MeetingAgendaItem[]> => {
    return apiClient.get<MeetingAgendaItem[]>(`/meetings/${meetingId}/agenda`, { organizationId: orgId });
  },

  listDecisions: async (orgId: string, meetingId: string): Promise<MeetingDecision[]> => {
    return apiClient.get<MeetingDecision[]>(`/meetings/${meetingId}/decisions`, { organizationId: orgId });
  },
};
