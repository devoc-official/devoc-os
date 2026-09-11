import { ValidationError, InvalidStateTransitionError } from '../../../shared/errors/index.js';

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type ParticipantType =
  | 'organizer'
  | 'required'
  | 'optional'
  | 'attendee'
  | 'presenter'
  | 'facilitator';

export type ResponseStatus =
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'tentative'
  | 'attended'
  | 'absent';

export type AgendaItemStatus = 'planned' | 'discussed' | 'deferred' | 'skipped';

export type NotesStatus = 'draft' | 'finalized';

export type ActionItemStatus = 'open' | 'completed' | 'cancelled';

export interface MeetingType {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meeting {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  meetingTypeId: string;
  status: MeetingStatus;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  locationType: string | null;
  locationReference: string | null;
  organizerPersonId: string;
  createdByPersonId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingTarget {
  id: string;
  organizationId: string;
  meetingId: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface MeetingParticipant {
  id: string;
  organizationId: string;
  meetingId: string;
  personId: string;
  participantType: ParticipantType;
  responseStatus: ResponseStatus;
  joinedAt: Date | null;
  leftAt: Date | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingAgendaItem {
  id: string;
  organizationId: string;
  meetingId: string;
  title: string;
  description: string | null;
  position: number;
  ownerPersonId: string | null;
  durationMinutes: number | null;
  status: AgendaItemStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingNotes {
  id: string;
  organizationId: string;
  meetingId: string;
  content: string;
  preparedByPersonId: string | null;
  status: NotesStatus;
  finalizedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingDecision {
  id: string;
  organizationId: string;
  meetingId: string;
  title: string;
  decisionText: string;
  decidedAt: Date;
  recordedByPersonId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingActionItem {
  id: string;
  organizationId: string;
  meetingId: string;
  title: string;
  description: string | null;
  ownerPersonId: string | null;
  dueAt: Date | null;
  status: ActionItemStatus;
  taskId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export const CANONICAL_MEETING_TRANSITIONS: Record<MeetingStatus, MeetingStatus[]> = {
  scheduled: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // terminal
  cancelled: [], // terminal
};

export function canTransitionMeetingStatus(
  currentStatus: MeetingStatus,
  targetStatus: MeetingStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = CANONICAL_MEETING_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function validateMeetingTimestamps(
  scheduledStartAt: Date,
  scheduledEndAt: Date,
  actualStartAt?: Date | null,
  actualEndAt?: Date | null
): void {
  if (scheduledEndAt.getTime() <= scheduledStartAt.getTime()) {
    throw new ValidationError('Scheduled end time must be after scheduled start time');
  }

  if (actualStartAt && actualEndAt) {
    if (actualEndAt.getTime() <= actualStartAt.getTime()) {
      throw new ValidationError('Actual end time must be after actual start time');
    }
  }
}
