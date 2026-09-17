import { MeetingRepository } from '../infrastructure/meeting.repository.js';
import { MeetingTypeRepository } from '../infrastructure/meeting-type.repository.js';
import { PeopleRepository } from '../../people/infrastructure/people.repository.js';
import { TaskRepository } from '../../projects-tasks/infrastructure/task.repository.js';
import { MeetingTargetResolverRegistry } from '../domain/meeting-target.registry.js';
import {
  Meeting,
  MeetingTarget,
  MeetingParticipant,
  MeetingAgendaItem,
  MeetingNotes,
  MeetingDecision,
  MeetingActionItem,
  MeetingStatus,
  ParticipantType,
  ResponseStatus,
  AgendaItemStatus,
  NotesStatus,
  ActionItemStatus,
  canTransitionMeetingStatus,
  validateMeetingTimestamps,
} from '../domain/meeting.entity.js';
import { NotFoundError, ValidationError, InvalidStateTransitionError } from '../../../shared/errors/index.js';
import { eventBus } from '../../../events/event-bus.js';

export interface CreateMeetingDTO {
  organizationId: string;
  title: string;
  description?: string | null;
  meetingTypeId: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  locationType?: string | null;
  locationReference?: string | null;
  organizerPersonId: string;
  createdByPersonId: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
}

export interface UpdateMeetingDTO {
  title?: string;
  description?: string | null;
  meetingTypeId?: string;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
  actualStartAt?: Date | null;
  actualEndAt?: Date | null;
  locationType?: string | null;
  locationReference?: string | null;
  organizerPersonId?: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
}

export interface MeetingDetail extends Meeting {
  target: MeetingTarget | null;
  participants: MeetingParticipant[];
  agenda: MeetingAgendaItem[];
  notes: MeetingNotes | null;
  decisions: MeetingDecision[];
  actionItems: MeetingActionItem[];
}

export class MeetingService {
  // --- MEETING CREATION & MANAGEMENT ---
  public static async createMeeting(dto: CreateMeetingDTO): Promise<MeetingDetail> {
    // 1. Verify Organizer person existence and tenant scoping
    const organizer = await PeopleRepository.findPersonById(dto.organizationId, dto.organizerPersonId);
    if (!organizer) {
      throw new NotFoundError(`Organizer person '${dto.organizerPersonId}' not found in organization`);
    }

    // 2. Verify CreatedBy person existence
    const creator = await PeopleRepository.findPersonById(dto.organizationId, dto.createdByPersonId);
    if (!creator) {
      throw new NotFoundError(`Creator person '${dto.createdByPersonId}' not found in organization`);
    }

    // 3. Verify Meeting Type existence and active status
    const meetingType = await MeetingTypeRepository.findTypeById(dto.organizationId, dto.meetingTypeId);
    if (!meetingType) {
      throw new NotFoundError(`Meeting type '${dto.meetingTypeId}' not found in organization`);
    }
    if (!meetingType.isActive) {
      throw new ValidationError(`Meeting type '${meetingType.name}' is inactive`);
    }

    // 4. Validate Timestamps
    validateMeetingTimestamps(dto.scheduledStartAt, dto.scheduledEndAt);

    // 5. Validate Target if supplied
    if (dto.targetType && dto.targetId) {
      const targetRegistry = MeetingTargetResolverRegistry.getInstance();
      await targetRegistry.resolveTarget(dto.organizationId, dto.targetType, dto.targetId);
    }

    // 6. Create Meeting
    const meeting = await MeetingRepository.createMeeting({
      organizationId: dto.organizationId,
      title: dto.title,
      description: dto.description,
      meetingTypeId: dto.meetingTypeId,
      status: 'scheduled',
      scheduledStartAt: dto.scheduledStartAt,
      scheduledEndAt: dto.scheduledEndAt,
      locationType: dto.locationType,
      locationReference: dto.locationReference,
      organizerPersonId: dto.organizerPersonId,
      createdByPersonId: dto.createdByPersonId,
      metadata: dto.metadata,
    });

    // 7. Save Target if supplied
    if (dto.targetType && dto.targetId) {
      await MeetingRepository.setMeetingTarget({
        organizationId: dto.organizationId,
        meetingId: meeting.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
      });
    }

    // 8. Automatically add Organizer as a Participant
    const organizerParticipant = await MeetingRepository.addParticipant({
      organizationId: dto.organizationId,
      meetingId: meeting.id,
      personId: dto.organizerPersonId,
      participantType: 'organizer',
      responseStatus: 'accepted',
    });

    eventBus.publish({
      eventName: 'participant.added',
      organizationId: dto.organizationId,
      actorId: dto.actorUserId,
      entityType: 'meeting_participant',
      entityId: organizerParticipant.id,
      payload: { meetingId: meeting.id, personId: dto.organizerPersonId, participantType: 'organizer' },
    });

    // 9. Domain Event
    eventBus.publish({
      eventName: 'meeting.created',
      organizationId: dto.organizationId,
      actorId: dto.actorUserId,
      entityType: 'meeting',
      entityId: meeting.id,
      payload: {
        title: meeting.title,
        meetingTypeId: meeting.meetingTypeId,
        organizerPersonId: meeting.organizerPersonId,
        scheduledStartAt: meeting.scheduledStartAt,
      },
    });

    return MeetingService.getMeetingById(dto.organizationId, meeting.id);
  }

  public static async getMeetingById(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingDetail> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    const target = await MeetingRepository.findTargetForMeeting(organizationId, meetingId);
    const participants = await MeetingRepository.findParticipantsForMeeting(organizationId, meetingId);
    const agenda = await MeetingRepository.findAgendaItemsForMeeting(organizationId, meetingId);
    const notes = await MeetingRepository.findNotesForMeeting(organizationId, meetingId);
    const decisions = await MeetingRepository.findDecisionsForMeeting(organizationId, meetingId);
    const actionItems = await MeetingRepository.findActionItemsForMeeting(organizationId, meetingId);

    return {
      ...meeting,
      target,
      participants,
      agenda,
      notes,
      decisions,
      actionItems,
    };
  }

  public static async listMeetings(
    organizationId: string,
    filters?: {
      status?: MeetingStatus;
      meetingTypeId?: string;
      organizerPersonId?: string;
      targetType?: string;
      targetId?: string;
      scheduledFrom?: Date;
      scheduledTo?: Date;
      participantPersonId?: string;
    }
  ): Promise<Meeting[]> {
    return MeetingRepository.findAllMeetings(organizationId, filters);
  }

  public static async updateMeeting(
    organizationId: string,
    meetingId: string,
    dto: UpdateMeetingDTO
  ): Promise<MeetingDetail> {
    const current = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!current) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new ValidationError(`Cannot update a meeting in terminal status '${current.status}'`);
    }

    if (dto.meetingTypeId) {
      const type = await MeetingTypeRepository.findTypeById(organizationId, dto.meetingTypeId);
      if (!type) {
        throw new NotFoundError(`Meeting type '${dto.meetingTypeId}' not found in organization`);
      }
      if (!type.isActive) {
        throw new ValidationError(`Meeting type '${type.name}' is inactive`);
      }
    }

    if (dto.organizerPersonId) {
      const organizer = await PeopleRepository.findPersonById(organizationId, dto.organizerPersonId);
      if (!organizer) {
        throw new NotFoundError(`Organizer person '${dto.organizerPersonId}' not found in organization`);
      }
    }

    const effectiveStart = dto.scheduledStartAt || current.scheduledStartAt;
    const effectiveEnd = dto.scheduledEndAt || current.scheduledEndAt;
    validateMeetingTimestamps(effectiveStart, effectiveEnd, dto.actualStartAt, dto.actualEndAt);

    if (dto.targetType && dto.targetId) {
      const targetRegistry = MeetingTargetResolverRegistry.getInstance();
      await targetRegistry.resolveTarget(organizationId, dto.targetType, dto.targetId);
      await MeetingRepository.setMeetingTarget({
        organizationId,
        meetingId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      });
    }

    const updated = await MeetingRepository.updateMeeting(organizationId, meetingId, dto);
    if (!updated) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    eventBus.publish({
      eventName: 'meeting.updated',
      organizationId,
      actorId: dto.actorUserId,
      entityType: 'meeting',
      entityId: meetingId,
      payload: { updates: dto },
    });

    return MeetingService.getMeetingById(organizationId, meetingId);
  }

  // --- LIFECYCLE TRANSITIONS ---
  public static async transitionMeetingStatus(
    organizationId: string,
    meetingId: string,
    targetStatus: MeetingStatus,
    actualStartAt?: Date | null,
    actualEndAt?: Date | null,
    actorUserId?: string
  ): Promise<MeetingDetail> {
    const current = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!current) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    if (!canTransitionMeetingStatus(current.status, targetStatus)) {
      throw new InvalidStateTransitionError(
        `Invalid meeting status transition from '${current.status}' to '${targetStatus}'`
      );
    }

    let start = actualStartAt !== undefined ? actualStartAt : current.actualStartAt;
    let end = actualEndAt !== undefined ? actualEndAt : current.actualEndAt;

    if (targetStatus === 'in_progress' && !start) {
      start = new Date();
    }
    if (targetStatus === 'completed') {
      if (!start) start = current.scheduledStartAt;
      if (!end) end = new Date();
    }

    const updated = await MeetingRepository.updateMeetingStatus(
      organizationId,
      meetingId,
      targetStatus,
      start,
      end
    );
    if (!updated) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    const eventNameMap: Record<MeetingStatus, string> = {
      scheduled: 'meeting.updated',
      in_progress: 'meeting.started',
      completed: 'meeting.completed',
      cancelled: 'meeting.cancelled',
    };

    eventBus.publish({
      eventName: eventNameMap[targetStatus],
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting',
      entityId: meetingId,
      payload: {
        previousStatus: current.status,
        newStatus: targetStatus,
      },
    });

    return MeetingService.getMeetingById(organizationId, meetingId);
  }

  // --- PARTICIPANTS ---
  public static async addParticipant(
    organizationId: string,
    meetingId: string,
    data: {
      personId: string;
      participantType?: ParticipantType;
      responseStatus?: ResponseStatus;
      joinedAt?: Date | null;
      leftAt?: Date | null;
      notes?: string | null;
      metadata?: Record<string, unknown>;
    },
    actorUserId?: string
  ): Promise<MeetingParticipant> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    const person = await PeopleRepository.findPersonById(organizationId, data.personId);
    if (!person) {
      throw new NotFoundError(`Person '${data.personId}' not found in organization`);
    }

    const existing = await MeetingRepository.findParticipantByPerson(organizationId, meetingId, data.personId);
    if (existing) {
      throw new ValidationError(`Person '${data.personId}' is already a participant in this meeting`);
    }

    const participant = await MeetingRepository.addParticipant({
      organizationId,
      meetingId,
      personId: data.personId,
      participantType: data.participantType,
      responseStatus: data.responseStatus,
      joinedAt: data.joinedAt,
      leftAt: data.leftAt,
      notes: data.notes,
      metadata: data.metadata,
    });

    eventBus.publish({
      eventName: 'participant.added',
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_participant',
      entityId: participant.id,
      payload: { meetingId, personId: data.personId },
    });

    return participant;
  }

  public static async listParticipants(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingParticipant[]> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }
    return MeetingRepository.findParticipantsForMeeting(organizationId, meetingId);
  }

  public static async updateParticipant(
    organizationId: string,
    meetingId: string,
    participantId: string,
    updates: {
      participantType?: ParticipantType;
      responseStatus?: ResponseStatus;
      joinedAt?: Date | null;
      leftAt?: Date | null;
      notes?: string | null;
      metadata?: Record<string, unknown>;
    },
    actorUserId?: string
  ): Promise<MeetingParticipant> {
    const updated = await MeetingRepository.updateParticipant(organizationId, meetingId, participantId, updates);
    if (!updated) {
      throw new NotFoundError(`Participant '${participantId}' not found on meeting '${meetingId}'`);
    }

    eventBus.publish({
      eventName: 'participant.updated',
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_participant',
      entityId: participantId,
      payload: { meetingId, updates },
    });

    return updated;
  }

  public static async removeParticipant(
    organizationId: string,
    meetingId: string,
    participantId: string,
    actorUserId?: string
  ): Promise<void> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    const participant = await MeetingRepository.findParticipantById(organizationId, meetingId, participantId);
    if (!participant) {
      throw new NotFoundError(`Participant '${participantId}' not found on meeting`);
    }

    if (participant.personId === meeting.organizerPersonId) {
      throw new ValidationError('Meeting organizer cannot be removed from participants');
    }

    const removed = await MeetingRepository.removeParticipant(organizationId, meetingId, participantId);
    if (!removed) {
      throw new NotFoundError(`Participant '${participantId}' not found on meeting`);
    }

    eventBus.publish({
      eventName: 'participant.removed',
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_participant',
      entityId: participantId,
      payload: { meetingId },
    });
  }

  // --- AGENDA ITEMS ---
  public static async addAgendaItem(
    organizationId: string,
    meetingId: string,
    data: {
      title: string;
      description?: string | null;
      position?: number;
      ownerPersonId?: string | null;
      durationMinutes?: number | null;
      status?: AgendaItemStatus;
      metadata?: Record<string, unknown>;
    },
    actorUserId?: string
  ): Promise<MeetingAgendaItem> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    if (data.ownerPersonId) {
      const owner = await PeopleRepository.findPersonById(organizationId, data.ownerPersonId);
      if (!owner) {
        throw new NotFoundError(`Agenda item owner '${data.ownerPersonId}' not found in organization`);
      }
    }

    const item = await MeetingRepository.addAgendaItem({
      organizationId,
      meetingId,
      title: data.title,
      description: data.description,
      position: data.position,
      ownerPersonId: data.ownerPersonId,
      durationMinutes: data.durationMinutes,
      status: data.status,
      metadata: data.metadata,
    });

    eventBus.publish({
      eventName: 'agenda_item.added',
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_agenda_item',
      entityId: item.id,
      payload: { meetingId, title: item.title },
    });

    return item;
  }

  public static async listAgendaItems(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingAgendaItem[]> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }
    return MeetingRepository.findAgendaItemsForMeeting(organizationId, meetingId);
  }

  public static async updateAgendaItem(
    organizationId: string,
    meetingId: string,
    agendaItemId: string,
    updates: {
      title?: string;
      description?: string | null;
      position?: number;
      ownerPersonId?: string | null;
      durationMinutes?: number | null;
      status?: AgendaItemStatus;
      metadata?: Record<string, unknown>;
    },
    actorUserId?: string
  ): Promise<MeetingAgendaItem> {
    if (updates.ownerPersonId) {
      const owner = await PeopleRepository.findPersonById(organizationId, updates.ownerPersonId);
      if (!owner) {
        throw new NotFoundError(`Agenda item owner '${updates.ownerPersonId}' not found in organization`);
      }
    }

    const updated = await MeetingRepository.updateAgendaItem(
      organizationId,
      meetingId,
      agendaItemId,
      updates
    );
    if (!updated) {
      throw new NotFoundError(`Agenda item '${agendaItemId}' not found on meeting '${meetingId}'`);
    }

    eventBus.publish({
      eventName: 'agenda_item.updated',
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_agenda_item',
      entityId: agendaItemId,
      payload: { meetingId, updates },
    });

    return updated;
  }

  public static async removeAgendaItem(
    organizationId: string,
    meetingId: string,
    agendaItemId: string,
    actorUserId?: string
  ): Promise<void> {
    const removed = await MeetingRepository.removeAgendaItem(organizationId, meetingId, agendaItemId);
    if (!removed) {
      throw new NotFoundError(`Agenda item '${agendaItemId}' not found on meeting`);
    }

    eventBus.publish({
      eventName: 'agenda_item.removed',
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_agenda_item',
      entityId: agendaItemId,
      payload: { meetingId },
    });
  }

  // --- NOTES / MINUTES ---
  public static async getNotes(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingNotes | null> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }
    return MeetingRepository.findNotesForMeeting(organizationId, meetingId);
  }

  public static async upsertDraftNotes(
    organizationId: string,
    meetingId: string,
    content: string,
    preparedByPersonId?: string | null,
    metadata?: Record<string, unknown>,
    actorUserId?: string
  ): Promise<MeetingNotes> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    const existing = await MeetingRepository.findNotesForMeeting(organizationId, meetingId);
    if (existing && existing.status === 'finalized') {
      throw new ValidationError('Cannot modify finalized meeting notes');
    }

    if (preparedByPersonId) {
      const preparer = await PeopleRepository.findPersonById(organizationId, preparedByPersonId);
      if (!preparer) {
        throw new NotFoundError(`Notes preparer person '${preparedByPersonId}' not found in organization`);
      }
    }

    return MeetingRepository.upsertNotes({
      organizationId,
      meetingId,
      content,
      preparedByPersonId,
      status: 'draft',
      metadata,
    });
  }

  public static async finalizeNotes(
    organizationId: string,
    meetingId: string,
    preparedByPersonId?: string | null,
    actorUserId?: string
  ): Promise<MeetingNotes> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    const existing = await MeetingRepository.findNotesForMeeting(organizationId, meetingId);
    if (!existing) {
      throw new NotFoundError(`No draft notes found for meeting '${meetingId}' to finalize`);
    }
    if (existing.status === 'finalized') {
      throw new ValidationError('Meeting notes are already finalized');
    }

    const finalized = await MeetingRepository.upsertNotes({
      organizationId,
      meetingId,
      content: existing.content,
      preparedByPersonId: preparedByPersonId || existing.preparedByPersonId,
      status: 'finalized',
      finalizedAt: new Date(),
    });

    eventBus.publish({
      eventName: 'notes.finalized',
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_notes',
      entityId: finalized.id,
      payload: { meetingId, finalizedAt: finalized.finalizedAt },
    });

    return finalized;
  }

  // --- DECISIONS ---
  public static async createDecision(
    organizationId: string,
    meetingId: string,
    data: {
      title: string;
      decisionText: string;
      decidedAt?: Date;
      recordedByPersonId?: string | null;
      metadata?: Record<string, unknown>;
    },
    actorUserId?: string
  ): Promise<MeetingDecision> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    if (data.recordedByPersonId) {
      const recorder = await PeopleRepository.findPersonById(organizationId, data.recordedByPersonId);
      if (!recorder) {
        throw new NotFoundError(`Decision recorder person '${data.recordedByPersonId}' not found in organization`);
      }
    }

    const decision = await MeetingRepository.createDecision({
      organizationId,
      meetingId,
      title: data.title,
      decisionText: data.decisionText,
      decidedAt: data.decidedAt,
      recordedByPersonId: data.recordedByPersonId,
      metadata: data.metadata,
    });

    eventBus.publish({
      eventName: 'decision.created',
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_decision',
      entityId: decision.id,
      payload: { meetingId, title: decision.title },
    });

    return decision;
  }

  public static async listDecisions(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingDecision[]> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }
    return MeetingRepository.findDecisionsForMeeting(organizationId, meetingId);
  }

  public static async updateDecision(
    organizationId: string,
    meetingId: string,
    decisionId: string,
    updates: {
      title?: string;
      decisionText?: string;
      decidedAt?: Date;
      metadata?: Record<string, unknown>;
    },
    actorUserId?: string
  ): Promise<MeetingDecision> {
    const updated = await MeetingRepository.updateDecision(
      organizationId,
      meetingId,
      decisionId,
      updates
    );
    if (!updated) {
      throw new NotFoundError(`Decision '${decisionId}' not found on meeting '${meetingId}'`);
    }
    return updated;
  }

  public static async deleteDecision(
    organizationId: string,
    meetingId: string,
    decisionId: string
  ): Promise<void> {
    const removed = await MeetingRepository.removeDecision(organizationId, meetingId, decisionId);
    if (!removed) {
      throw new NotFoundError(`Decision '${decisionId}' not found on meeting`);
    }
  }

  // --- ACTION ITEMS ---
  public static async createActionItem(
    organizationId: string,
    meetingId: string,
    data: {
      title: string;
      description?: string | null;
      ownerPersonId?: string | null;
      dueAt?: Date | null;
      status?: ActionItemStatus;
      taskId?: string | null;
      metadata?: Record<string, unknown>;
    },
    actorUserId?: string
  ): Promise<MeetingActionItem> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }

    if (data.ownerPersonId) {
      const owner = await PeopleRepository.findPersonById(organizationId, data.ownerPersonId);
      if (!owner) {
        throw new NotFoundError(`Action item owner '${data.ownerPersonId}' not found in organization`);
      }
    }

    if (data.taskId) {
      const task = await TaskRepository.findTaskById(organizationId, data.taskId);
      if (!task) {
        throw new NotFoundError(`Linked task '${data.taskId}' not found in organization`);
      }
    }

    const actionItem = await MeetingRepository.createActionItem({
      organizationId,
      meetingId,
      title: data.title,
      description: data.description,
      ownerPersonId: data.ownerPersonId,
      dueAt: data.dueAt,
      status: data.status,
      taskId: data.taskId,
      metadata: data.metadata,
    });

    eventBus.publish({
      eventName: 'action_item.created',
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_action_item',
      entityId: actionItem.id,
      payload: { meetingId, title: actionItem.title, taskId: actionItem.taskId },
    });

    return actionItem;
  }

  public static async listActionItems(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingActionItem[]> {
    const meeting = await MeetingRepository.findMeetingById(organizationId, meetingId);
    if (!meeting) {
      throw new NotFoundError(`Meeting '${meetingId}' not found in organization`);
    }
    return MeetingRepository.findActionItemsForMeeting(organizationId, meetingId);
  }

  public static async updateActionItem(
    organizationId: string,
    meetingId: string,
    actionItemId: string,
    updates: {
      title?: string;
      description?: string | null;
      ownerPersonId?: string | null;
      dueAt?: Date | null;
      status?: ActionItemStatus;
      taskId?: string | null;
      metadata?: Record<string, unknown>;
    },
    actorUserId?: string
  ): Promise<MeetingActionItem> {
    if (updates.ownerPersonId) {
      const owner = await PeopleRepository.findPersonById(organizationId, updates.ownerPersonId);
      if (!owner) {
        throw new NotFoundError(`Action item owner '${updates.ownerPersonId}' not found in organization`);
      }
    }

    if (updates.taskId) {
      const task = await TaskRepository.findTaskById(organizationId, updates.taskId);
      if (!task) {
        throw new NotFoundError(`Linked task '${updates.taskId}' not found in organization`);
      }
    }

    const updated = await MeetingRepository.updateActionItem(
      organizationId,
      meetingId,
      actionItemId,
      updates
    );
    if (!updated) {
      throw new NotFoundError(`Action item '${actionItemId}' not found on meeting '${meetingId}'`);
    }

    const eventNameMap: Record<ActionItemStatus, string> = {
      open: 'action_item.updated',
      completed: 'action_item.completed',
      cancelled: 'action_item.cancelled',
    };

    const eventName = updates.status ? eventNameMap[updates.status] : 'action_item.updated';

    eventBus.publish({
      eventName,
      organizationId,
      actorId: actorUserId,
      entityType: 'meeting_action_item',
      entityId: actionItemId,
      payload: { meetingId, updates },
    });

    return updated;
  }

  public static async linkTaskToActionItem(
    organizationId: string,
    meetingId: string,
    actionItemId: string,
    taskId: string,
    actorUserId?: string
  ): Promise<MeetingActionItem> {
    const task = await TaskRepository.findTaskById(organizationId, taskId);
    if (!task) {
      throw new NotFoundError(`Task '${taskId}' not found in organization`);
    }

    return MeetingService.updateActionItem(
      organizationId,
      meetingId,
      actionItemId,
      { taskId },
      actorUserId
    );
  }

  public static async unlinkTaskFromActionItem(
    organizationId: string,
    meetingId: string,
    actionItemId: string,
    actorUserId?: string
  ): Promise<MeetingActionItem> {
    return MeetingService.updateActionItem(
      organizationId,
      meetingId,
      actionItemId,
      { taskId: null },
      actorUserId
    );
  }
}
