import { getDbClient } from '../../../database/index.js';
import { BranchProps, BusinessUnitProps, DepartmentProps, TeamProps, ResourceStatus } from '../domain/structure.entity.js';

export class StructureRepository {
  // --- BRANCHES ---
  public static async createBranch(data: {
    organizationId: string;
    name: string;
    code: string;
    status?: ResourceStatus;
  }): Promise<BranchProps> {
    const db = getDbClient();
    const status = data.status || 'active';
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO branches (organization_id, name, code, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, organization_id, name, code, status, created_at, updated_at;`,
      [data.organizationId, data.name, data.code.toUpperCase().trim(), status]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findBranchById(organizationId: string, id: string): Promise<BranchProps | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, status, created_at, updated_at
       FROM branches
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
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listBranches(organizationId: string): Promise<BranchProps[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, status, created_at, updated_at
       FROM branches
       WHERE organization_id = $1
       ORDER BY name ASC;`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async updateBranch(
    organizationId: string,
    id: string,
    data: { name?: string; status?: ResourceStatus }
  ): Promise<BranchProps | null> {
    const db = getDbClient();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
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
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE branches
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING id, organization_id, name, code, status, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // --- BUSINESS UNITS ---
  public static async createBusinessUnit(data: {
    organizationId: string;
    name: string;
    code: string;
    status?: ResourceStatus;
  }): Promise<BusinessUnitProps> {
    const db = getDbClient();
    const status = data.status || 'active';
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO business_units (organization_id, name, code, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, organization_id, name, code, status, created_at, updated_at;`,
      [data.organizationId, data.name, data.code.toUpperCase().trim(), status]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findBusinessUnitById(organizationId: string, id: string): Promise<BusinessUnitProps | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, status, created_at, updated_at
       FROM business_units
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
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listBusinessUnits(organizationId: string): Promise<BusinessUnitProps[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, status, created_at, updated_at
       FROM business_units
       WHERE organization_id = $1
       ORDER BY name ASC;`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async updateBusinessUnit(
    organizationId: string,
    id: string,
    data: { name?: string; status?: ResourceStatus }
  ): Promise<BusinessUnitProps | null> {
    const db = getDbClient();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
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
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE business_units
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING id, organization_id, name, code, status, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // --- DEPARTMENTS ---
  public static async createDepartment(data: {
    organizationId: string;
    name: string;
    code: string;
    status?: ResourceStatus;
  }): Promise<DepartmentProps> {
    const db = getDbClient();
    const status = data.status || 'active';
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO departments (organization_id, name, code, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, organization_id, name, code, status, created_at, updated_at;`,
      [data.organizationId, data.name, data.code.toUpperCase().trim(), status]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findDepartmentById(organizationId: string, id: string): Promise<DepartmentProps | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, status, created_at, updated_at
       FROM departments
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
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listDepartments(organizationId: string): Promise<DepartmentProps[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, status, created_at, updated_at
       FROM departments
       WHERE organization_id = $1
       ORDER BY name ASC;`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async updateDepartment(
    organizationId: string,
    id: string,
    data: { name?: string; status?: ResourceStatus }
  ): Promise<DepartmentProps | null> {
    const db = getDbClient();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
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
      status: ResourceStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE departments
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING id, organization_id, name, code, status, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // --- TEAMS ---
  public static async createTeam(data: {
    organizationId: string;
    name: string;
    code: string;
    status?: ResourceStatus;
    isTemporary?: boolean;
    departmentId?: string | null;
    businessUnitId?: string | null;
  }): Promise<TeamProps> {
    const db = getDbClient();
    const status = data.status || 'active';
    const isTemporary = data.isTemporary || false;
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      is_temporary: boolean;
      department_id: string | null;
      business_unit_id: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO teams (organization_id, name, code, status, is_temporary, department_id, business_unit_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, organization_id, name, code, status, is_temporary, department_id, business_unit_id, created_at, updated_at;`,
      [
        data.organizationId,
        data.name,
        data.code.toUpperCase().trim(),
        status,
        isTemporary,
        data.departmentId || null,
        data.businessUnitId || null,
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      isTemporary: row.is_temporary,
      departmentId: row.department_id,
      businessUnitId: row.business_unit_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findTeamById(organizationId: string, id: string): Promise<TeamProps | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      is_temporary: boolean;
      department_id: string | null;
      business_unit_id: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, status, is_temporary, department_id, business_unit_id, created_at, updated_at
       FROM teams
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
      status: row.status,
      isTemporary: row.is_temporary,
      departmentId: row.department_id,
      businessUnitId: row.business_unit_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listTeams(organizationId: string): Promise<TeamProps[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      is_temporary: boolean;
      department_id: string | null;
      business_unit_id: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, status, is_temporary, department_id, business_unit_id, created_at, updated_at
       FROM teams
       WHERE organization_id = $1
       ORDER BY name ASC;`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      isTemporary: row.is_temporary,
      departmentId: row.department_id,
      businessUnitId: row.business_unit_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async updateTeam(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      status?: ResourceStatus;
      isTemporary?: boolean;
      departmentId?: string | null;
      businessUnitId?: string | null;
    }
  ): Promise<TeamProps | null> {
    const db = getDbClient();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.isTemporary !== undefined) {
      fields.push(`is_temporary = $${paramIndex++}`);
      values.push(data.isTemporary);
    }
    if (data.departmentId !== undefined) {
      fields.push(`department_id = $${paramIndex++}`);
      values.push(data.departmentId);
    }
    if (data.businessUnitId !== undefined) {
      fields.push(`business_unit_id = $${paramIndex++}`);
      values.push(data.businessUnitId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(organizationId);

    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      status: ResourceStatus;
      is_temporary: boolean;
      department_id: string | null;
      business_unit_id: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE teams
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING id, organization_id, name, code, status, is_temporary, department_id, business_unit_id, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      status: row.status,
      isTemporary: row.is_temporary,
      departmentId: row.department_id,
      businessUnitId: row.business_unit_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
