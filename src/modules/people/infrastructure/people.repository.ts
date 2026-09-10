import { getDbClient, DbClient } from '../../../database/index.js';
import { PersonProps, PersonStatus } from '../domain/person.entity.js';

export interface RoleRecord {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  isSystem: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonRoleRecord {
  id: string;
  organizationId: string;
  personId: string;
  roleId: string;
  roleName?: string;
  roleCode?: string;
  businessUnitId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  status: 'active' | 'inactive' | 'ended';
  startDate: Date;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PeopleRepository {
  // --- PEOPLE ---
  public static async createPerson(
    data: {
      organizationId: string;
      userId?: string | null;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
      status?: PersonStatus;
    },
    client?: DbClient
  ): Promise<PersonProps> {
    const db = client || getDbClient();
    const status = data.status || 'active';
    const res = await db.query<{
      id: string;
      organization_id: string;
      user_id: string | null;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      status: PersonStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO people (organization_id, user_id, first_name, last_name, email, phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, organization_id, user_id, first_name, last_name, email, phone, status, created_at, updated_at;`,
      [
        data.organizationId,
        data.userId || null,
        data.firstName.trim(),
        data.lastName.trim(),
        data.email.toLowerCase().trim(),
        data.phone || null,
        status,
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findPersonById(organizationId: string, id: string): Promise<PersonProps | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      user_id: string | null;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      status: PersonStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, user_id, first_name, last_name, email, phone, status, created_at, updated_at
       FROM people
       WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listPeople(organizationId: string): Promise<PersonProps[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      user_id: string | null;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      status: PersonStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, user_id, first_name, last_name, email, phone, status, created_at, updated_at
       FROM people
       WHERE organization_id = $1
       ORDER BY last_name ASC, first_name ASC;`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async updatePerson(
    organizationId: string,
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      status?: PersonStatus;
      userId?: string | null;
    }
  ): Promise<PersonProps | null> {
    const db = getDbClient();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.firstName !== undefined) {
      fields.push(`first_name = $${paramIndex++}`);
      values.push(data.firstName.trim());
    }
    if (data.lastName !== undefined) {
      fields.push(`last_name = $${paramIndex++}`);
      values.push(data.lastName.trim());
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.userId !== undefined) {
      fields.push(`user_id = $${paramIndex++}`);
      values.push(data.userId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(organizationId);

    const res = await db.query<{
      id: string;
      organization_id: string;
      user_id: string | null;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      status: PersonStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE people
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING id, organization_id, user_id, first_name, last_name, email, phone, status, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // --- ROLES ---
  public static async createRole(data: {
    organizationId: string;
    name: string;
    code: string;
    description?: string | null;
    isSystem?: boolean;
    status?: 'active' | 'inactive';
  }): Promise<RoleRecord> {
    const db = getDbClient();
    const status = data.status || 'active';
    const isSystem = data.isSystem || false;
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      description: string | null;
      is_system: boolean;
      status: 'active' | 'inactive';
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO roles (organization_id, name, code, description, is_system, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, organization_id, name, code, description, is_system, status, created_at, updated_at;`,
      [data.organizationId, data.name, data.code.toUpperCase().trim(), data.description || null, isSystem, status]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      description: row.description,
      isSystem: row.is_system,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findRoleById(organizationId: string, id: string): Promise<RoleRecord | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      description: string | null;
      is_system: boolean;
      status: 'active' | 'inactive';
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, description, is_system, status, created_at, updated_at
       FROM roles
       WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      description: row.description,
      isSystem: row.is_system,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listRoles(organizationId: string): Promise<RoleRecord[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      description: string | null;
      is_system: boolean;
      status: 'active' | 'inactive';
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, description, is_system, status, created_at, updated_at
       FROM roles
       WHERE organization_id = $1
       ORDER BY name ASC;`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      description: row.description,
      isSystem: row.is_system,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async updateRole(
    organizationId: string,
    id: string,
    data: { name?: string; description?: string | null; status?: 'active' | 'inactive' }
  ): Promise<RoleRecord | null> {
    const db = getDbClient();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(organizationId);

    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      description: string | null;
      is_system: boolean;
      status: 'active' | 'inactive';
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE roles
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING id, organization_id, name, code, description, is_system, status, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      description: row.description,
      isSystem: row.is_system,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // --- PERSON ROLES ---
  public static async assignPersonRole(data: {
    organizationId: string;
    personId: string;
    roleId: string;
    businessUnitId?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    startDate?: Date;
  }): Promise<PersonRoleRecord> {
    const db = getDbClient();
    const startDate = data.startDate || new Date();
    const res = await db.query<{
      id: string;
      organization_id: string;
      person_id: string;
      role_id: string;
      business_unit_id: string | null;
      department_id: string | null;
      team_id: string | null;
      status: 'active' | 'inactive' | 'ended';
      start_date: Date;
      end_date: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO person_roles (organization_id, person_id, role_id, business_unit_id, department_id, team_id, status, start_date)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
       RETURNING id, organization_id, person_id, role_id, business_unit_id, department_id, team_id, status, start_date, end_date, created_at, updated_at;`,
      [
        data.organizationId,
        data.personId,
        data.roleId,
        data.businessUnitId || null,
        data.departmentId || null,
        data.teamId || null,
        startDate,
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      roleId: row.role_id,
      businessUnitId: row.business_unit_id,
      departmentId: row.department_id,
      teamId: row.team_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listPersonRoles(organizationId: string, personId: string): Promise<PersonRoleRecord[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      person_id: string;
      role_id: string;
      role_name: string;
      role_code: string;
      business_unit_id: string | null;
      department_id: string | null;
      team_id: string | null;
      status: 'active' | 'inactive' | 'ended';
      start_date: Date;
      end_date: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT pr.id, pr.organization_id, pr.person_id, pr.role_id, r.name AS role_name, r.code AS role_code,
              pr.business_unit_id, pr.department_id, pr.team_id, pr.status, pr.start_date, pr.end_date, pr.created_at, pr.updated_at
       FROM person_roles pr
       JOIN roles r ON r.id = pr.role_id
       WHERE pr.organization_id = $1 AND pr.person_id = $2
       ORDER BY pr.start_date DESC;`,
      [organizationId, personId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      roleId: row.role_id,
      roleName: row.role_name,
      roleCode: row.role_code,
      businessUnitId: row.business_unit_id,
      departmentId: row.department_id,
      teamId: row.team_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async endPersonRole(organizationId: string, id: string): Promise<PersonRoleRecord | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      person_id: string;
      role_id: string;
      business_unit_id: string | null;
      department_id: string | null;
      team_id: string | null;
      status: 'active' | 'inactive' | 'ended';
      start_date: Date;
      end_date: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE person_roles
       SET status = 'ended', end_date = CURRENT_DATE, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING id, organization_id, person_id, role_id, business_unit_id, department_id, team_id, status, start_date, end_date, created_at, updated_at;`,
      [id, organizationId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      roleId: row.role_id,
      businessUnitId: row.business_unit_id,
      departmentId: row.department_id,
      teamId: row.team_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
