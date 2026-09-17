import { getDbClient, DbClient } from '../../../database/index.js';
import {
  Project,
  ProjectOwner,
  ProjectBusinessUnit,
  ProjectStatus,
  ProjectPriority,
  ProjectOwnershipType,
} from '../domain/project.entity.js';

interface RawProjectRow {
  id: string;
  organization_id: string;
  name: string;
  key: string;
  description: string | null;
  project_type: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_at: Date | null;
  target_end_at: Date | null;
  actual_end_at: Date | null;
  created_by_person_id: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawProjectOwnerRow {
  id: string;
  organization_id: string;
  project_id: string;
  person_id: string;
  ownership_type: ProjectOwnershipType;
  start_at: Date | null;
  end_at: Date | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface RawProjectBURow {
  organization_id: string;
  project_id: string;
  business_unit_id: string;
  created_at: Date;
}

export class ProjectRepository {
  private static mapRowToProject(row: RawProjectRow): Project {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      key: row.key,
      description: row.description,
      projectType: row.project_type,
      status: row.status,
      priority: row.priority,
      startAt: row.start_at ? new Date(row.start_at) : null,
      targetEndAt: row.target_end_at ? new Date(row.target_end_at) : null,
      actualEndAt: row.actual_end_at ? new Date(row.actual_end_at) : null,
      createdByPersonId: row.created_by_person_id,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private static mapRowToOwner(row: RawProjectOwnerRow): ProjectOwner {
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      personId: row.person_id,
      ownershipType: row.ownership_type,
      startAt: row.start_at ? new Date(row.start_at) : null,
      endAt: row.end_at ? new Date(row.end_at) : null,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public static async createProject(
    data: {
      organizationId: string;
      name: string;
      key: string;
      description?: string | null;
      projectType: string;
      status?: ProjectStatus;
      priority?: ProjectPriority;
      startAt?: Date | null;
      targetEndAt?: Date | null;
      createdByPersonId: string;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient
  ): Promise<Project> {
    const db = client || getDbClient();
    const res = await db.query<RawProjectRow>(
      `INSERT INTO projects (
        organization_id, name, key, description, project_type, status,
        priority, start_at, target_end_at, created_by_person_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;`,
      [
        data.organizationId,
        data.name.trim(),
        data.key.trim().toUpperCase(),
        data.description || null,
        data.projectType,
        data.status || 'idea',
        data.priority || 'medium',
        data.startAt ? data.startAt.toISOString() : null,
        data.targetEndAt ? data.targetEndAt.toISOString() : null,
        data.createdByPersonId,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToProject(res.rows[0]);
  }

  public static async findProjectById(organizationId: string, projectId: string): Promise<Project | null> {
    const db = getDbClient();
    const res = await db.query<RawProjectRow>(
      `SELECT * FROM projects WHERE id = $1 AND organization_id = $2;`,
      [projectId, organizationId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToProject(res.rows[0]);
  }

  public static async findProjectByKey(organizationId: string, key: string): Promise<Project | null> {
    const db = getDbClient();
    const res = await db.query<RawProjectRow>(
      `SELECT * FROM projects WHERE organization_id = $1 AND key = $2;`,
      [organizationId, key.trim().toUpperCase()]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToProject(res.rows[0]);
  }

  public static async findAllProjects(
    organizationId: string,
    filters?: {
      status?: ProjectStatus;
      priority?: ProjectPriority;
      projectType?: string;
      businessUnitId?: string;
    }
  ): Promise<Project[]> {
    const db = getDbClient();
    let query = `SELECT DISTINCT p.* FROM projects p`;
    const params: unknown[] = [organizationId];

    if (filters?.businessUnitId) {
      query += ` JOIN project_business_units pbu ON pbu.project_id = p.id`;
    }

    query += ` WHERE p.organization_id = $1`;

    if (filters?.businessUnitId) {
      params.push(filters.businessUnitId);
      query += ` AND pbu.business_unit_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND p.status = $${params.length}`;
    }
    if (filters?.priority) {
      params.push(filters.priority);
      query += ` AND p.priority = $${params.length}`;
    }
    if (filters?.projectType) {
      params.push(filters.projectType);
      query += ` AND p.project_type = $${params.length}`;
    }

    query += ` ORDER BY p.created_at DESC;`;

    const res = await db.query<RawProjectRow>(query, params);
    return res.rows.map((row) => this.mapRowToProject(row));
  }

  public static async updateProject(
    organizationId: string,
    projectId: string,
    updates: {
      name?: string;
      description?: string | null;
      projectType?: string;
      priority?: ProjectPriority;
      startAt?: Date | null;
      targetEndAt?: Date | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Project | null> {
    const db = getDbClient();
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [projectId, organizationId];

    if (updates.name !== undefined) {
      params.push(updates.name.trim());
      setClauses.push(`name = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      setClauses.push(`description = $${params.length}`);
    }
    if (updates.projectType !== undefined) {
      params.push(updates.projectType);
      setClauses.push(`project_type = $${params.length}`);
    }
    if (updates.priority !== undefined) {
      params.push(updates.priority);
      setClauses.push(`priority = $${params.length}`);
    }
    if (updates.startAt !== undefined) {
      params.push(updates.startAt ? updates.startAt.toISOString() : null);
      setClauses.push(`start_at = $${params.length}`);
    }
    if (updates.targetEndAt !== undefined) {
      params.push(updates.targetEndAt ? updates.targetEndAt.toISOString() : null);
      setClauses.push(`target_end_at = $${params.length}`);
    }
    if (updates.metadata !== undefined) {
      params.push(JSON.stringify(updates.metadata));
      setClauses.push(`metadata = $${params.length}`);
    }

    const res = await db.query<RawProjectRow>(
      `UPDATE projects
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToProject(res.rows[0]);
  }

  public static async updateProjectStatus(
    organizationId: string,
    projectId: string,
    newStatus: ProjectStatus,
    actualEndAt?: Date | null
  ): Promise<Project | null> {
    const db = getDbClient();
    const res = await db.query<RawProjectRow>(
      `UPDATE projects
       SET status = $3, actual_end_at = $4, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      [projectId, organizationId, newStatus, actualEndAt ? actualEndAt.toISOString() : null]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToProject(res.rows[0]);
  }

  // --- PROJECT OWNERS ---
  public static async addProjectOwner(
    organizationId: string,
    projectId: string,
    personId: string,
    ownershipType: ProjectOwnershipType,
    startAt?: Date | null,
    endAt?: Date | null,
    metadata?: Record<string, unknown>
  ): Promise<ProjectOwner> {
    const db = getDbClient();
    const res = await db.query<RawProjectOwnerRow>(
      `INSERT INTO project_owners (
        organization_id, project_id, person_id, ownership_type, start_at, end_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;`,
      [
        organizationId,
        projectId,
        personId,
        ownershipType,
        startAt ? startAt.toISOString() : null,
        endAt ? endAt.toISOString() : null,
        JSON.stringify(metadata || {}),
      ]
    );

    return this.mapRowToOwner(res.rows[0]);
  }

  public static async findProjectOwners(organizationId: string, projectId: string): Promise<ProjectOwner[]> {
    const db = getDbClient();
    const res = await db.query<RawProjectOwnerRow>(
      `SELECT * FROM project_owners WHERE project_id = $1 AND organization_id = $2 ORDER BY created_at ASC;`,
      [projectId, organizationId]
    );
    return res.rows.map((row) => this.mapRowToOwner(row));
  }

  public static async removeProjectOwner(
    organizationId: string,
    projectId: string,
    ownerId: string
  ): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM project_owners
       WHERE (id = $1 OR person_id = $1) AND project_id = $2 AND organization_id = $3
       RETURNING id;`,
      [ownerId, projectId, organizationId]
    );
    return res.rows.length > 0;
  }

  // --- PROJECT BUSINESS UNITS ---
  public static async linkBusinessUnit(
    organizationId: string,
    projectId: string,
    businessUnitId: string
  ): Promise<ProjectBusinessUnit> {
    const db = getDbClient();
    const res = await db.query<RawProjectBURow>(
      `INSERT INTO project_business_units (organization_id, project_id, business_unit_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, business_unit_id) DO UPDATE SET created_at = NOW()
       RETURNING *;`,
      [organizationId, projectId, businessUnitId]
    );
    return {
      organizationId: res.rows[0].organization_id,
      projectId: res.rows[0].project_id,
      businessUnitId: res.rows[0].business_unit_id,
      createdAt: new Date(res.rows[0].created_at),
    };
  }

  public static async findProjectBusinessUnits(
    organizationId: string,
    projectId: string
  ): Promise<ProjectBusinessUnit[]> {
    const db = getDbClient();
    const res = await db.query<RawProjectBURow>(
      `SELECT * FROM project_business_units WHERE project_id = $1 AND organization_id = $2;`,
      [projectId, organizationId]
    );
    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      projectId: row.project_id,
      businessUnitId: row.business_unit_id,
      createdAt: new Date(row.created_at),
    }));
  }

  public static async unlinkBusinessUnit(
    organizationId: string,
    projectId: string,
    businessUnitId: string
  ): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM project_business_units
       WHERE project_id = $1 AND business_unit_id = $2 AND organization_id = $3
       RETURNING project_id;`,
      [projectId, businessUnitId, organizationId]
    );
    return res.rows.length > 0;
  }
}
