import { getDbClient, DbClient } from '../../../database/index.js';
import { MeetingType } from '../domain/meeting.entity.js';

interface RawMeetingTypeRow {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export class MeetingTypeRepository {
  private static mapRowToType(row: RawMeetingTypeRow): MeetingType {
    return {
      id: row.id,
      organizationId: row.organization_id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public static async createType(
    data: {
      organizationId: string;
      code: string;
      name: string;
      description?: string | null;
      isActive?: boolean;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient
  ): Promise<MeetingType> {
    const db = client || getDbClient();
    const res = await db.query<RawMeetingTypeRow>(
      `INSERT INTO meeting_types (
        organization_id, code, name, description, is_active, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;`,
      [
        data.organizationId,
        data.code.trim().toLowerCase(),
        data.name.trim(),
        data.description || null,
        data.isActive !== undefined ? data.isActive : true,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToType(res.rows[0]);
  }

  public static async findTypeById(
    organizationId: string,
    typeId: string
  ): Promise<MeetingType | null> {
    const db = getDbClient();
    const res = await db.query<RawMeetingTypeRow>(
      `SELECT * FROM meeting_types WHERE id = $1 AND organization_id = $2;`,
      [typeId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToType(res.rows[0]);
  }

  public static async findTypeByCode(
    organizationId: string,
    code: string
  ): Promise<MeetingType | null> {
    const db = getDbClient();
    const res = await db.query<RawMeetingTypeRow>(
      `SELECT * FROM meeting_types WHERE organization_id = $1 AND code = $2;`,
      [organizationId, code.trim().toLowerCase()]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToType(res.rows[0]);
  }

  public static async findAllTypes(
    organizationId: string,
    activeOnly: boolean = false
  ): Promise<MeetingType[]> {
    const db = getDbClient();
    let query = `SELECT * FROM meeting_types WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (activeOnly) {
      query += ` AND is_active = true`;
    }

    query += ` ORDER BY name ASC;`;

    const res = await db.query<RawMeetingTypeRow>(query, params);
    return res.rows.map((row) => this.mapRowToType(row));
  }

  public static async updateType(
    organizationId: string,
    typeId: string,
    updates: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MeetingType | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [typeId, organizationId];

    if (updates.name !== undefined) {
      params.push(updates.name.trim());
      setClauses.push(`name = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      setClauses.push(`description = $${params.length}`);
    }
    if (updates.isActive !== undefined) {
      params.push(updates.isActive);
      setClauses.push(`is_active = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawMeetingTypeRow>(
      `UPDATE meeting_types
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToType(res.rows[0]);
  }
}
