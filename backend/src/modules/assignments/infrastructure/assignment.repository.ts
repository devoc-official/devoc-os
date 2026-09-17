import { getDbClient } from '../../../database/index.js';
import {
  Assignment,
  AssignmentHistory,
  AssignmentStatus,
  CapacityType,
  AuthorityType,
} from '../domain/assignment.entity.js';

interface RawAssignmentRow {
  id: string;
  organization_id: string;
  person_id: string;
  target_type: string;
  target_id: string;
  assignment_type: string;
  role_context: string | null;
  status: AssignmentStatus;
  start_at: Date;
  end_at: Date | null;
  capacity_type: CapacityType;
  capacity_value: string;
  capacity_unit: string;
  authority_type: AuthorityType;
  assigned_by_person_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawHistoryRow {
  id: string;
  organization_id: string;
  assignment_id: string;
  previous_status: AssignmentStatus | null;
  new_status: AssignmentStatus;
  reason: string | null;
  actor_user_id: string | null;
  actor_person_id: string | null;
  changed_at: Date;
  metadata: Record<string, unknown>;
}

export class AssignmentRepository {
  private mapRowToAssignment(row: RawAssignmentRow): Assignment {
    return {
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      targetType: row.target_type,
      targetId: row.target_id,
      assignmentType: row.assignment_type,
      roleContext: row.role_context,
      status: row.status,
      startAt: new Date(row.start_at),
      endAt: row.end_at ? new Date(row.end_at) : null,
      capacityType: row.capacity_type,
      capacityValue: parseFloat(row.capacity_value),
      capacityUnit: row.capacity_unit,
      authorityType: row.authority_type,
      assignedByPersonId: row.assigned_by_person_id,
      notes: row.notes,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToHistory(row: RawHistoryRow): AssignmentHistory {
    return {
      id: row.id,
      organizationId: row.organization_id,
      assignmentId: row.assignment_id,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      reason: row.reason,
      actorUserId: row.actor_user_id,
      actorPersonId: row.actor_person_id,
      changedAt: new Date(row.changed_at),
      metadata: row.metadata || {},
    };
  }

  public async create(data: {
    organizationId: string;
    personId: string;
    targetType: string;
    targetId: string;
    assignmentType: string;
    roleContext?: string | null;
    status?: AssignmentStatus;
    startAt: Date;
    endAt?: Date | null;
    capacityType?: CapacityType;
    capacityValue?: number;
    capacityUnit?: string;
    authorityType?: AuthorityType;
    assignedByPersonId?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<Assignment> {
    const db = getDbClient();
    const res = await db.query<RawAssignmentRow>(
      `INSERT INTO assignments (
        organization_id, person_id, target_type, target_id, assignment_type,
        role_context, status, start_at, end_at, capacity_type,
        capacity_value, capacity_unit, authority_type, assigned_by_person_id,
        notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;`,
      [
        data.organizationId,
        data.personId,
        data.targetType,
        data.targetId,
        data.assignmentType,
        data.roleContext || null,
        data.status || 'scheduled',
        data.startAt.toISOString(),
        data.endAt ? data.endAt.toISOString() : null,
        data.capacityType || 'allocation',
        data.capacityValue ?? 100,
        data.capacityUnit || 'percentage',
        data.authorityType || 'org_admin',
        data.assignedByPersonId || null,
        data.notes || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToAssignment(res.rows[0]);
  }

  public async findById(organizationId: string, assignmentId: string): Promise<Assignment | null> {
    const db = getDbClient();
    const res = await db.query<RawAssignmentRow>(
      `SELECT * FROM assignments WHERE id = $1 AND organization_id = $2;`,
      [assignmentId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToAssignment(res.rows[0]);
  }

  public async findActiveDuplicate(
    organizationId: string,
    personId: string,
    targetType: string,
    targetId: string,
    assignmentType: string
  ): Promise<Assignment | null> {
    const db = getDbClient();
    const res = await db.query<RawAssignmentRow>(
      `SELECT * FROM assignments
       WHERE organization_id = $1
         AND person_id = $2
         AND target_type = $3
         AND target_id = $4
         AND assignment_type = $5
         AND status IN ('scheduled', 'active', 'paused');`,
      [organizationId, personId, targetType, targetId, assignmentType]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToAssignment(res.rows[0]);
  }

  public async findAll(
    organizationId: string,
    filters?: {
      personId?: string;
      targetType?: string;
      targetId?: string;
      status?: AssignmentStatus;
    }
  ): Promise<Assignment[]> {
    const db = getDbClient();
    let query = `SELECT * FROM assignments WHERE organization_id = $1`;
    const params: (string | number)[] = [organizationId];

    if (filters?.personId) {
      params.push(filters.personId);
      query += ` AND person_id = $${params.length}`;
    }
    if (filters?.targetType) {
      params.push(filters.targetType);
      query += ` AND target_type = $${params.length}`;
    }
    if (filters?.targetId) {
      params.push(filters.targetId);
      query += ` AND target_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;

    const res = await db.query<RawAssignmentRow>(query, params);
    return res.rows.map((row) => this.mapRowToAssignment(row));
  }

  public async findActiveByPerson(organizationId: string, personId: string): Promise<Assignment[]> {
    const db = getDbClient();
    const res = await db.query<RawAssignmentRow>(
      `SELECT * FROM assignments
       WHERE organization_id = $1
         AND person_id = $2
         AND status IN ('active', 'scheduled', 'paused');`,
      [organizationId, personId]
    );
    return res.rows.map((row) => this.mapRowToAssignment(row));
  }

  public async update(
    organizationId: string,
    assignmentId: string,
    updates: {
      roleContext?: string | null;
      endAt?: Date | null;
      capacityType?: CapacityType;
      capacityValue?: number;
      capacityUnit?: string;
      notes?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Assignment | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [assignmentId, organizationId];

    if (updates.roleContext !== undefined) {
      params.push(updates.roleContext);
      setClauses.push(`role_context = $${params.length}`);
    }
    if (updates.endAt !== undefined) {
      params.push(updates.endAt ? updates.endAt.toISOString() : null);
      setClauses.push(`end_at = $${params.length}`);
    }
    if (updates.capacityType !== undefined) {
      params.push(updates.capacityType);
      setClauses.push(`capacity_type = $${params.length}`);
    }
    if (updates.capacityValue !== undefined) {
      params.push(updates.capacityValue);
      setClauses.push(`capacity_value = $${params.length}`);
    }
    if (updates.capacityUnit !== undefined) {
      params.push(updates.capacityUnit);
      setClauses.push(`capacity_unit = $${params.length}`);
    }
    if (updates.notes !== undefined) {
      params.push(updates.notes);
      setClauses.push(`notes = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawAssignmentRow>(
      `UPDATE assignments
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToAssignment(res.rows[0]);
  }

  public async updateStatus(
    organizationId: string,
    assignmentId: string,
    newStatus: AssignmentStatus
  ): Promise<Assignment | null> {
    const db = getDbClient();
    const res = await db.query<RawAssignmentRow>(
      `UPDATE assignments
       SET status = $3, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      [assignmentId, organizationId, newStatus]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToAssignment(res.rows[0]);
  }

  public async appendHistory(data: {
    organizationId: string;
    assignmentId: string;
    previousStatus?: AssignmentStatus | null;
    newStatus: AssignmentStatus;
    reason?: string | null;
    actorUserId?: string | null;
    actorPersonId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<AssignmentHistory> {
    const db = getDbClient();
    const res = await db.query<RawHistoryRow>(
      `INSERT INTO assignment_history (
        organization_id, assignment_id, previous_status, new_status,
        reason, actor_user_id, actor_person_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`,
      [
        data.organizationId,
        data.assignmentId,
        data.previousStatus || null,
        data.newStatus,
        data.reason || null,
        data.actorUserId || null,
        data.actorPersonId || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToHistory(res.rows[0]);
  }

  public async getHistory(organizationId: string, assignmentId: string): Promise<AssignmentHistory[]> {
    const db = getDbClient();
    const res = await db.query<RawHistoryRow>(
      `SELECT * FROM assignment_history
       WHERE assignment_id = $1 AND organization_id = $2
       ORDER BY changed_at ASC;`,
      [assignmentId, organizationId]
    );

    return res.rows.map((row) => this.mapRowToHistory(row));
  }
}
