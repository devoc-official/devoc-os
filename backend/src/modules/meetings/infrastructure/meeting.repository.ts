import { getDbClient, DbClient } from '../../../database/index.js';
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
} from '../domain/meeting.entity.js';

interface RawMeetingRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  meeting_type_id: string;
  status: MeetingStatus;
  scheduled_start_at: Date;
  scheduled_end_at: Date;
  actual_start_at: Date | null;
  actual_end_at: Date | null;
  location_type: string | null;
  location_reference: string | null;
  organizer_person_id: string;
  created_by_person_id: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawTargetRow {
  id: string;
  organization_id: string;
  meeting_id: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

interface RawParticipantRow {
  id: string;
  organization_id: string;
  meeting_id: string;
  person_id: string;
  participant_type: ParticipantType;
  response_status: ResponseStatus;
  joined_at: Date | null;
  left_at: Date | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawAgendaRow {
  id: string;
  organization_id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  position: number;
  owner_person_id: string | null;
  duration_minutes: number | null;
  status: AgendaItemStatus;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawNotesRow {
  id: string;
  organization_id: string;
  meeting_id: string;
  content: string;
  prepared_by_person_id: string | null;
  status: NotesStatus;
  finalized_at: Date | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawDecisionRow {
  id: string;
  organization_id: string;
  meeting_id: string;
  title: string;
  decision_text: string;
  decided_at: Date;
  recorded_by_person_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawActionItemRow {
  id: string;
  organization_id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  owner_person_id: string | null;
  due_at: Date | null;
  status: ActionItemStatus;
  task_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export class MeetingRepository {
  private static mapRowToMeeting(row: RawMeetingRow): Meeting {
    return {
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      description: row.description,
      meetingTypeId: row.meeting_type_id,
      status: row.status,
      scheduledStartAt: new Date(row.scheduled_start_at),
      scheduledEndAt: new Date(row.scheduled_end_at),
      actualStartAt: row.actual_start_at ? new Date(row.actual_start_at) : null,
      actualEndAt: row.actual_end_at ? new Date(row.actual_end_at) : null,
      locationType: row.location_type,
      locationReference: row.location_reference,
      organizerPersonId: row.organizer_person_id,
      createdByPersonId: row.created_by_person_id,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToTarget(row: RawTargetRow): MeetingTarget {
    return {
      id: row.id,
      organizationId: row.organization_id,
      meetingId: row.meeting_id,
      targetType: row.target_type,
      targetId: row.target_id,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
    };
  }

  private static mapRowToParticipant(row: RawParticipantRow): MeetingParticipant {
    return {
      id: row.id,
      organizationId: row.organization_id,
      meetingId: row.meeting_id,
      personId: row.person_id,
      participantType: row.participant_type,
      responseStatus: row.response_status,
      joinedAt: row.joined_at ? new Date(row.joined_at) : null,
      leftAt: row.left_at ? new Date(row.left_at) : null,
      notes: row.notes,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToAgenda(row: RawAgendaRow): MeetingAgendaItem {
    return {
      id: row.id,
      organizationId: row.organization_id,
      meetingId: row.meeting_id,
      title: row.title,
      description: row.description,
      position: Number(row.position),
      ownerPersonId: row.owner_person_id,
      durationMinutes: row.duration_minutes !== null ? Number(row.duration_minutes) : null,
      status: row.status,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToNotes(row: RawNotesRow): MeetingNotes {
    return {
      id: row.id,
      organizationId: row.organization_id,
      meetingId: row.meeting_id,
      content: row.content,
      preparedByPersonId: row.prepared_by_person_id,
      status: row.status,
      finalizedAt: row.finalized_at ? new Date(row.finalized_at) : null,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToDecision(row: RawDecisionRow): MeetingDecision {
    return {
      id: row.id,
      organizationId: row.organization_id,
      meetingId: row.meeting_id,
      title: row.title,
      decisionText: row.decision_text,
      decidedAt: new Date(row.decided_at),
      recordedByPersonId: row.recorded_by_person_id,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToActionItem(row: RawActionItemRow): MeetingActionItem {
    return {
      id: row.id,
      organizationId: row.organization_id,
      meetingId: row.meeting_id,
      title: row.title,
      description: row.description,
      ownerPersonId: row.owner_person_id,
      dueAt: row.due_at ? new Date(row.due_at) : null,
      status: row.status,
      taskId: row.task_id,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // --- MEETINGS CRUD ---
  public static async createMeeting(
    data: {
      organizationId: string;
      title: string;
      description?: string | null;
      meetingTypeId: string;
      status?: MeetingStatus;
      scheduledStartAt: Date;
      scheduledEndAt: Date;
      actualStartAt?: Date | null;
      actualEndAt?: Date | null;
      locationType?: string | null;
      locationReference?: string | null;
      organizerPersonId: string;
      createdByPersonId: string;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient
  ): Promise<Meeting> {
    const db = client || getDbClient();
    const res = await db.query<RawMeetingRow>(
      `INSERT INTO meetings (
        organization_id, title, description, meeting_type_id, status,
        scheduled_start_at, scheduled_end_at, actual_start_at, actual_end_at,
        location_type, location_reference, organizer_person_id, created_by_person_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;`,
      [
        data.organizationId,
        data.title.trim(),
        data.description || null,
        data.meetingTypeId,
        data.status || 'scheduled',
        data.scheduledStartAt.toISOString(),
        data.scheduledEndAt.toISOString(),
        data.actualStartAt ? data.actualStartAt.toISOString() : null,
        data.actualEndAt ? data.actualEndAt.toISOString() : null,
        data.locationType || 'virtual',
        data.locationReference || null,
        data.organizerPersonId,
        data.createdByPersonId,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToMeeting(res.rows[0]);
  }

  public static async findMeetingById(
    organizationId: string,
    meetingId: string
  ): Promise<Meeting | null> {
    const db = getDbClient();
    const res = await db.query<RawMeetingRow>(
      `SELECT * FROM meetings WHERE id = $1 AND organization_id = $2;`,
      [meetingId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToMeeting(res.rows[0]);
  }

  public static async findAllMeetings(
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
    const db = getDbClient();
    let query = `
      SELECT DISTINCT m.*
      FROM meetings m
      LEFT JOIN meeting_targets mt ON mt.meeting_id = m.id
      LEFT JOIN meeting_participants mp ON mp.meeting_id = m.id
      WHERE m.organization_id = $1
    `;
    const params: unknown[] = [organizationId];

    if (filters?.status) {
      params.push(filters.status);
      query += ` AND m.status = $${params.length}`;
    }
    if (filters?.meetingTypeId) {
      params.push(filters.meetingTypeId);
      query += ` AND m.meeting_type_id = $${params.length}`;
    }
    if (filters?.organizerPersonId) {
      params.push(filters.organizerPersonId);
      query += ` AND m.organizer_person_id = $${params.length}`;
    }
    if (filters?.targetType) {
      params.push(filters.targetType);
      query += ` AND mt.target_type = $${params.length}`;
    }
    if (filters?.targetId) {
      params.push(filters.targetId);
      query += ` AND mt.target_id = $${params.length}`;
    }
    if (filters?.scheduledFrom) {
      params.push(filters.scheduledFrom.toISOString());
      query += ` AND m.scheduled_start_at >= $${params.length}`;
    }
    if (filters?.scheduledTo) {
      params.push(filters.scheduledTo.toISOString());
      query += ` AND m.scheduled_start_at <= $${params.length}`;
    }
    if (filters?.participantPersonId) {
      params.push(filters.participantPersonId);
      query += ` AND mp.person_id = $${params.length}`;
    }

    query += ` ORDER BY m.scheduled_start_at DESC;`;

    const res = await db.query<RawMeetingRow>(query, params);
    return res.rows.map((row) => this.mapRowToMeeting(row));
  }

  public static async updateMeeting(
    organizationId: string,
    meetingId: string,
    updates: {
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
      metadata?: Record<string, unknown>;
    }
  ): Promise<Meeting | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [meetingId, organizationId];

    if (updates.title !== undefined) {
      params.push(updates.title.trim());
      setClauses.push(`title = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      setClauses.push(`description = $${params.length}`);
    }
    if (updates.meetingTypeId !== undefined) {
      params.push(updates.meetingTypeId);
      setClauses.push(`meeting_type_id = $${params.length}`);
    }
    if (updates.scheduledStartAt !== undefined) {
      params.push(updates.scheduledStartAt.toISOString());
      setClauses.push(`scheduled_start_at = $${params.length}`);
    }
    if (updates.scheduledEndAt !== undefined) {
      params.push(updates.scheduledEndAt.toISOString());
      setClauses.push(`scheduled_end_at = $${params.length}`);
    }
    if (updates.actualStartAt !== undefined) {
      params.push(updates.actualStartAt ? updates.actualStartAt.toISOString() : null);
      setClauses.push(`actual_start_at = $${params.length}`);
    }
    if (updates.actualEndAt !== undefined) {
      params.push(updates.actualEndAt ? updates.actualEndAt.toISOString() : null);
      setClauses.push(`actual_end_at = $${params.length}`);
    }
    if (updates.locationType !== undefined) {
      params.push(updates.locationType);
      setClauses.push(`location_type = $${params.length}`);
    }
    if (updates.locationReference !== undefined) {
      params.push(updates.locationReference);
      setClauses.push(`location_reference = $${params.length}`);
    }
    if (updates.organizerPersonId !== undefined) {
      params.push(updates.organizerPersonId);
      setClauses.push(`organizer_person_id = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawMeetingRow>(
      `UPDATE meetings
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToMeeting(res.rows[0]);
  }

  public static async updateMeetingStatus(
    organizationId: string,
    meetingId: string,
    status: MeetingStatus,
    actualStartAt?: Date | null,
    actualEndAt?: Date | null
  ): Promise<Meeting | null> {
    const db = getDbClient();
    const setClauses: string[] = ['status = $3', 'updated_at = NOW()'];
    const params: unknown[] = [meetingId, organizationId, status];

    if (actualStartAt !== undefined) {
      params.push(actualStartAt ? actualStartAt.toISOString() : null);
      setClauses.push(`actual_start_at = $${params.length}`);
    }
    if (actualEndAt !== undefined) {
      params.push(actualEndAt ? actualEndAt.toISOString() : null);
      setClauses.push(`actual_end_at = $${params.length}`);
    }

    const res = await db.query<RawMeetingRow>(
      `UPDATE meetings
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToMeeting(res.rows[0]);
  }

  // --- TARGET ---
  public static async setMeetingTarget(
    data: {
      organizationId: string;
      meetingId: string;
      targetType: string;
      targetId: string;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient
  ): Promise<MeetingTarget> {
    const db = client || getDbClient();
    // Delete old target if exists for this meeting
    await db.query(`DELETE FROM meeting_targets WHERE meeting_id = $1 AND organization_id = $2;`, [
      data.meetingId,
      data.organizationId,
    ]);

    const res = await db.query<RawTargetRow>(
      `INSERT INTO meeting_targets (organization_id, meeting_id, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [
        data.organizationId,
        data.meetingId,
        data.targetType,
        data.targetId,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToTarget(res.rows[0]);
  }

  public static async findTargetForMeeting(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingTarget | null> {
    const db = getDbClient();
    const res = await db.query<RawTargetRow>(
      `SELECT * FROM meeting_targets WHERE meeting_id = $1 AND organization_id = $2;`,
      [meetingId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToTarget(res.rows[0]);
  }

  // --- PARTICIPANTS ---
  public static async addParticipant(
    data: {
      organizationId: string;
      meetingId: string;
      personId: string;
      participantType?: ParticipantType;
      responseStatus?: ResponseStatus;
      joinedAt?: Date | null;
      leftAt?: Date | null;
      notes?: string | null;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient
  ): Promise<MeetingParticipant> {
    const db = client || getDbClient();
    const res = await db.query<RawParticipantRow>(
      `INSERT INTO meeting_participants (
        organization_id, meeting_id, person_id, participant_type, response_status,
        joined_at, left_at, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        data.organizationId,
        data.meetingId,
        data.personId,
        data.participantType || 'required',
        data.responseStatus || 'invited',
        data.joinedAt ? data.joinedAt.toISOString() : null,
        data.leftAt ? data.leftAt.toISOString() : null,
        data.notes || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToParticipant(res.rows[0]);
  }

  public static async findParticipantById(
    organizationId: string,
    meetingId: string,
    participantId: string
  ): Promise<MeetingParticipant | null> {
    const db = getDbClient();
    const res = await db.query<RawParticipantRow>(
      `SELECT * FROM meeting_participants WHERE id = $1 AND meeting_id = $2 AND organization_id = $3;`,
      [participantId, meetingId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToParticipant(res.rows[0]);
  }

  public static async findParticipantByPerson(
    organizationId: string,
    meetingId: string,
    personId: string
  ): Promise<MeetingParticipant | null> {
    const db = getDbClient();
    const res = await db.query<RawParticipantRow>(
      `SELECT * FROM meeting_participants WHERE meeting_id = $1 AND person_id = $2 AND organization_id = $3;`,
      [meetingId, personId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToParticipant(res.rows[0]);
  }

  public static async findParticipantsForMeeting(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingParticipant[]> {
    const db = getDbClient();
    const res = await db.query<RawParticipantRow>(
      `SELECT * FROM meeting_participants WHERE meeting_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [meetingId, organizationId]
    );
    return res.rows.map((r) => this.mapRowToParticipant(r));
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
    }
  ): Promise<MeetingParticipant | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [participantId, meetingId, organizationId];

    if (updates.participantType !== undefined) {
      params.push(updates.participantType);
      setClauses.push(`participant_type = $${params.length}`);
    }
    if (updates.responseStatus !== undefined) {
      params.push(updates.responseStatus);
      setClauses.push(`response_status = $${params.length}`);
    }
    if (updates.joinedAt !== undefined) {
      params.push(updates.joinedAt ? updates.joinedAt.toISOString() : null);
      setClauses.push(`joined_at = $${params.length}`);
    }
    if (updates.leftAt !== undefined) {
      params.push(updates.leftAt ? updates.leftAt.toISOString() : null);
      setClauses.push(`left_at = $${params.length}`);
    }
    if (updates.notes !== undefined) {
      params.push(updates.notes);
      setClauses.push(`notes = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawParticipantRow>(
      `UPDATE meeting_participants
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND meeting_id = $2 AND organization_id = $3
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToParticipant(res.rows[0]);
  }

  public static async removeParticipant(
    organizationId: string,
    meetingId: string,
    participantId: string
  ): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM meeting_participants WHERE id = $1 AND meeting_id = $2 AND organization_id = $3 RETURNING id;`,
      [participantId, meetingId, organizationId]
    );
    return res.rows.length > 0;
  }

  // --- AGENDA ITEMS ---
  public static async addAgendaItem(
    data: {
      organizationId: string;
      meetingId: string;
      title: string;
      description?: string | null;
      position?: number;
      ownerPersonId?: string | null;
      durationMinutes?: number | null;
      status?: AgendaItemStatus;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MeetingAgendaItem> {
    const db = getDbClient();

    let pos = data.position;
    if (pos === undefined) {
      const maxPosRes = await db.query<{ max_pos: number | null }>(
        `SELECT MAX(position) as max_pos FROM meeting_agenda_items WHERE meeting_id = $1 AND organization_id = $2;`,
        [data.meetingId, data.organizationId]
      );
      pos = (maxPosRes.rows[0]?.max_pos || 0) + 1;
    }

    const res = await db.query<RawAgendaRow>(
      `INSERT INTO meeting_agenda_items (
        organization_id, meeting_id, title, description, position,
        owner_person_id, duration_minutes, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        data.organizationId,
        data.meetingId,
        data.title.trim(),
        data.description || null,
        pos,
        data.ownerPersonId || null,
        data.durationMinutes !== undefined ? data.durationMinutes : null,
        data.status || 'planned',
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToAgenda(res.rows[0]);
  }

  public static async findAgendaItemsForMeeting(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingAgendaItem[]> {
    const db = getDbClient();
    const res = await db.query<RawAgendaRow>(
      `SELECT * FROM meeting_agenda_items WHERE meeting_id = $1 AND organization_id = $2 ORDER BY position ASC;`,
      [meetingId, organizationId]
    );
    return res.rows.map((r) => this.mapRowToAgenda(r));
  }

  public static async findAgendaItemById(
    organizationId: string,
    meetingId: string,
    agendaItemId: string
  ): Promise<MeetingAgendaItem | null> {
    const db = getDbClient();
    const res = await db.query<RawAgendaRow>(
      `SELECT * FROM meeting_agenda_items WHERE id = $1 AND meeting_id = $2 AND organization_id = $3;`,
      [agendaItemId, meetingId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToAgenda(res.rows[0]);
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
    }
  ): Promise<MeetingAgendaItem | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [agendaItemId, meetingId, organizationId];

    if (updates.title !== undefined) {
      params.push(updates.title.trim());
      setClauses.push(`title = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      setClauses.push(`description = $${params.length}`);
    }
    if (updates.position !== undefined) {
      params.push(updates.position);
      setClauses.push(`position = $${params.length}`);
    }
    if (updates.ownerPersonId !== undefined) {
      params.push(updates.ownerPersonId);
      setClauses.push(`owner_person_id = $${params.length}`);
    }
    if (updates.durationMinutes !== undefined) {
      params.push(updates.durationMinutes);
      setClauses.push(`duration_minutes = $${params.length}`);
    }
    if (updates.status !== undefined) {
      params.push(updates.status);
      setClauses.push(`status = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawAgendaRow>(
      `UPDATE meeting_agenda_items
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND meeting_id = $2 AND organization_id = $3
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToAgenda(res.rows[0]);
  }

  public static async removeAgendaItem(
    organizationId: string,
    meetingId: string,
    agendaItemId: string
  ): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM meeting_agenda_items WHERE id = $1 AND meeting_id = $2 AND organization_id = $3 RETURNING id;`,
      [agendaItemId, meetingId, organizationId]
    );
    return res.rows.length > 0;
  }

  // --- NOTES / MINUTES ---
  public static async upsertNotes(
    data: {
      organizationId: string;
      meetingId: string;
      content: string;
      preparedByPersonId?: string | null;
      status?: NotesStatus;
      finalizedAt?: Date | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MeetingNotes> {
    const db = getDbClient();
    const res = await db.query<RawNotesRow>(
      `INSERT INTO meeting_notes (
        organization_id, meeting_id, content, prepared_by_person_id, status, finalized_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (meeting_id) DO UPDATE
      SET content = EXCLUDED.content,
          prepared_by_person_id = COALESCE(EXCLUDED.prepared_by_person_id, meeting_notes.prepared_by_person_id),
          status = EXCLUDED.status,
          finalized_at = EXCLUDED.finalized_at,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      RETURNING *;`,
      [
        data.organizationId,
        data.meetingId,
        data.content,
        data.preparedByPersonId || null,
        data.status || 'draft',
        data.finalizedAt ? data.finalizedAt.toISOString() : null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToNotes(res.rows[0]);
  }

  public static async findNotesForMeeting(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingNotes | null> {
    const db = getDbClient();
    const res = await db.query<RawNotesRow>(
      `SELECT * FROM meeting_notes WHERE meeting_id = $1 AND organization_id = $2;`,
      [meetingId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToNotes(res.rows[0]);
  }

  // --- DECISIONS ---
  public static async createDecision(
    data: {
      organizationId: string;
      meetingId: string;
      title: string;
      decisionText: string;
      decidedAt?: Date;
      recordedByPersonId?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MeetingDecision> {
    const db = getDbClient();
    const res = await db.query<RawDecisionRow>(
      `INSERT INTO meeting_decisions (
        organization_id, meeting_id, title, decision_text, decided_at,
        recorded_by_person_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;`,
      [
        data.organizationId,
        data.meetingId,
        data.title.trim(),
        data.decisionText,
        data.decidedAt ? data.decidedAt.toISOString() : new Date().toISOString(),
        data.recordedByPersonId || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToDecision(res.rows[0]);
  }

  public static async findDecisionsForMeeting(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingDecision[]> {
    const db = getDbClient();
    const res = await db.query<RawDecisionRow>(
      `SELECT * FROM meeting_decisions WHERE meeting_id = $1 AND organization_id = $2 ORDER BY decided_at ASC;`,
      [meetingId, organizationId]
    );
    return res.rows.map((r) => this.mapRowToDecision(r));
  }

  public static async findDecisionById(
    organizationId: string,
    meetingId: string,
    decisionId: string
  ): Promise<MeetingDecision | null> {
    const db = getDbClient();
    const res = await db.query<RawDecisionRow>(
      `SELECT * FROM meeting_decisions WHERE id = $1 AND meeting_id = $2 AND organization_id = $3;`,
      [decisionId, meetingId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToDecision(res.rows[0]);
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
    }
  ): Promise<MeetingDecision | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [decisionId, meetingId, organizationId];

    if (updates.title !== undefined) {
      params.push(updates.title.trim());
      setClauses.push(`title = $${params.length}`);
    }
    if (updates.decisionText !== undefined) {
      params.push(updates.decisionText);
      setClauses.push(`decision_text = $${params.length}`);
    }
    if (updates.decidedAt !== undefined) {
      params.push(updates.decidedAt.toISOString());
      setClauses.push(`decided_at = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawDecisionRow>(
      `UPDATE meeting_decisions
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND meeting_id = $2 AND organization_id = $3
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToDecision(res.rows[0]);
  }

  public static async removeDecision(
    organizationId: string,
    meetingId: string,
    decisionId: string
  ): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM meeting_decisions WHERE id = $1 AND meeting_id = $2 AND organization_id = $3 RETURNING id;`,
      [decisionId, meetingId, organizationId]
    );
    return res.rows.length > 0;
  }

  // --- ACTION ITEMS ---
  public static async createActionItem(
    data: {
      organizationId: string;
      meetingId: string;
      title: string;
      description?: string | null;
      ownerPersonId?: string | null;
      dueAt?: Date | null;
      status?: ActionItemStatus;
      taskId?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MeetingActionItem> {
    const db = getDbClient();
    const res = await db.query<RawActionItemRow>(
      `INSERT INTO meeting_action_items (
        organization_id, meeting_id, title, description, owner_person_id,
        due_at, status, task_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        data.organizationId,
        data.meetingId,
        data.title.trim(),
        data.description || null,
        data.ownerPersonId || null,
        data.dueAt ? data.dueAt.toISOString() : null,
        data.status || 'open',
        data.taskId || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToActionItem(res.rows[0]);
  }

  public static async findActionItemsForMeeting(
    organizationId: string,
    meetingId: string
  ): Promise<MeetingActionItem[]> {
    const db = getDbClient();
    const res = await db.query<RawActionItemRow>(
      `SELECT * FROM meeting_action_items WHERE meeting_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [meetingId, organizationId]
    );
    return res.rows.map((r) => this.mapRowToActionItem(r));
  }

  public static async findActionItemById(
    organizationId: string,
    meetingId: string,
    actionItemId: string
  ): Promise<MeetingActionItem | null> {
    const db = getDbClient();
    const res = await db.query<RawActionItemRow>(
      `SELECT * FROM meeting_action_items WHERE id = $1 AND meeting_id = $2 AND organization_id = $3;`,
      [actionItemId, meetingId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToActionItem(res.rows[0]);
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
    }
  ): Promise<MeetingActionItem | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [actionItemId, meetingId, organizationId];

    if (updates.title !== undefined) {
      params.push(updates.title.trim());
      setClauses.push(`title = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      setClauses.push(`description = $${params.length}`);
    }
    if (updates.ownerPersonId !== undefined) {
      params.push(updates.ownerPersonId);
      setClauses.push(`owner_person_id = $${params.length}`);
    }
    if (updates.dueAt !== undefined) {
      params.push(updates.dueAt ? updates.dueAt.toISOString() : null);
      setClauses.push(`due_at = $${params.length}`);
    }
    if (updates.status !== undefined) {
      params.push(updates.status);
      setClauses.push(`status = $${params.length}`);
    }
    if (updates.taskId !== undefined) {
      params.push(updates.taskId);
      setClauses.push(`task_id = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawActionItemRow>(
      `UPDATE meeting_action_items
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND meeting_id = $2 AND organization_id = $3
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToActionItem(res.rows[0]);
  }
}
