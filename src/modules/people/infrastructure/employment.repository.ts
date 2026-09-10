import { getDbClient, DbClient } from '../../../database/index.js';
import { EmploymentProps, EmploymentStatus, EmploymentType } from '../domain/employment.entity.js';

export interface EmploymentHistoryRecord {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  previousStatus?: string | null;
  newStatus: string;
  changeReason?: string | null;
  effectiveDate: Date;
  createdAt: Date;
}

export class EmploymentRepository {
  public static async createEmployment(
    data: {
      organizationId: string;
      personId: string;
      employmentType: EmploymentType;
      status?: EmploymentStatus;
      jobTitle: string;
      departmentId?: string | null;
      businessUnitId?: string | null;
      branchId?: string | null;
      managerId?: string | null;
      startDate?: Date;
    },
    client?: DbClient
  ): Promise<EmploymentProps> {
    const db = client || getDbClient();
    const status = data.status || 'active';
    const startDate = data.startDate || new Date();

    const res = await db.query<{
      id: string;
      organization_id: string;
      person_id: string;
      employment_type: EmploymentType;
      status: EmploymentStatus;
      job_title: string;
      department_id: string | null;
      business_unit_id: string | null;
      branch_id: string | null;
      manager_id: string | null;
      start_date: Date;
      end_date: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO employments (
        organization_id, person_id, employment_type, status, job_title,
        department_id, business_unit_id, branch_id, manager_id, start_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, organization_id, person_id, employment_type, status, job_title,
                department_id, business_unit_id, branch_id, manager_id, start_date, end_date, created_at, updated_at;`,
      [
        data.organizationId,
        data.personId,
        data.employmentType,
        status,
        data.jobTitle.trim(),
        data.departmentId || null,
        data.businessUnitId || null,
        data.branchId || null,
        data.managerId || null,
        startDate,
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      employmentType: row.employment_type,
      status: row.status,
      jobTitle: row.job_title,
      departmentId: row.department_id,
      businessUnitId: row.business_unit_id,
      branchId: row.branch_id,
      managerId: row.manager_id,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findEmploymentById(organizationId: string, id: string): Promise<EmploymentProps | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      person_id: string;
      employment_type: EmploymentType;
      status: EmploymentStatus;
      job_title: string;
      department_id: string | null;
      business_unit_id: string | null;
      branch_id: string | null;
      manager_id: string | null;
      start_date: Date;
      end_date: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, person_id, employment_type, status, job_title,
              department_id, business_unit_id, branch_id, manager_id, start_date, end_date, created_at, updated_at
       FROM employments
       WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      employmentType: row.employment_type,
      status: row.status,
      jobTitle: row.job_title,
      departmentId: row.department_id,
      businessUnitId: row.business_unit_id,
      branchId: row.branch_id,
      managerId: row.manager_id,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listEmployments(organizationId: string): Promise<EmploymentProps[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      person_id: string;
      employment_type: EmploymentType;
      status: EmploymentStatus;
      job_title: string;
      department_id: string | null;
      business_unit_id: string | null;
      branch_id: string | null;
      manager_id: string | null;
      start_date: Date;
      end_date: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, person_id, employment_type, status, job_title,
              department_id, business_unit_id, branch_id, manager_id, start_date, end_date, created_at, updated_at
       FROM employments
       WHERE organization_id = $1
       ORDER BY start_date DESC;`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      employmentType: row.employment_type,
      status: row.status,
      jobTitle: row.job_title,
      departmentId: row.department_id,
      businessUnitId: row.business_unit_id,
      branchId: row.branch_id,
      managerId: row.manager_id,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async updateEmployment(
    organizationId: string,
    id: string,
    data: {
      status?: EmploymentStatus;
      jobTitle?: string;
      departmentId?: string | null;
      businessUnitId?: string | null;
      branchId?: string | null;
      managerId?: string | null;
      endDate?: Date | null;
    },
    client?: DbClient
  ): Promise<EmploymentProps | null> {
    const db = client || getDbClient();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.jobTitle !== undefined) {
      fields.push(`job_title = $${paramIndex++}`);
      values.push(data.jobTitle.trim());
    }
    if (data.departmentId !== undefined) {
      fields.push(`department_id = $${paramIndex++}`);
      values.push(data.departmentId);
    }
    if (data.businessUnitId !== undefined) {
      fields.push(`business_unit_id = $${paramIndex++}`);
      values.push(data.businessUnitId);
    }
    if (data.branchId !== undefined) {
      fields.push(`branch_id = $${paramIndex++}`);
      values.push(data.branchId);
    }
    if (data.managerId !== undefined) {
      fields.push(`manager_id = $${paramIndex++}`);
      values.push(data.managerId);
    }
    if (data.endDate !== undefined) {
      fields.push(`end_date = $${paramIndex++}`);
      values.push(data.endDate);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(organizationId);

    const res = await db.query<{
      id: string;
      organization_id: string;
      person_id: string;
      employment_type: EmploymentType;
      status: EmploymentStatus;
      job_title: string;
      department_id: string | null;
      business_unit_id: string | null;
      branch_id: string | null;
      manager_id: string | null;
      start_date: Date;
      end_date: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE employments
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING id, organization_id, person_id, employment_type, status, job_title,
                 department_id, business_unit_id, branch_id, manager_id, start_date, end_date, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      employmentType: row.employment_type,
      status: row.status,
      jobTitle: row.job_title,
      departmentId: row.department_id,
      businessUnitId: row.business_unit_id,
      branchId: row.branch_id,
      managerId: row.manager_id,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // --- EMPLOYMENT HISTORY ---
  public static async recordHistory(
    data: {
      organizationId: string;
      employmentId: string;
      personId: string;
      previousStatus?: string | null;
      newStatus: string;
      changeReason?: string | null;
      effectiveDate?: Date;
    },
    client?: DbClient
  ): Promise<EmploymentHistoryRecord> {
    const db = client || getDbClient();
    const effectiveDate = data.effectiveDate || new Date();

    const res = await db.query<{
      id: string;
      organization_id: string;
      employment_id: string;
      person_id: string;
      previous_status: string | null;
      new_status: string;
      change_reason: string | null;
      effective_date: Date;
      created_at: Date;
    }>(
      `INSERT INTO employment_history (organization_id, employment_id, person_id, previous_status, new_status, change_reason, effective_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, organization_id, employment_id, person_id, previous_status, new_status, change_reason, effective_date, created_at;`,
      [
        data.organizationId,
        data.employmentId,
        data.personId,
        data.previousStatus || null,
        data.newStatus,
        data.changeReason || null,
        effectiveDate,
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      changeReason: row.change_reason,
      effectiveDate: row.effective_date,
      createdAt: row.created_at,
    };
  }

  public static async listHistory(organizationId: string, employmentId: string): Promise<EmploymentHistoryRecord[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      employment_id: string;
      person_id: string;
      previous_status: string | null;
      new_status: string;
      change_reason: string | null;
      effective_date: Date;
      created_at: Date;
    }>(
      `SELECT id, organization_id, employment_id, person_id, previous_status, new_status, change_reason, effective_date, created_at
       FROM employment_history
       WHERE organization_id = $1 AND employment_id = $2
       ORDER BY created_at DESC;`,
      [organizationId, employmentId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      employmentId: row.employment_id,
      personId: row.person_id,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      changeReason: row.change_reason,
      effectiveDate: row.effective_date,
      createdAt: row.created_at,
    }));
  }

  // --- REPORTING HIERARCHY ---
  public static async getDirectReports(organizationId: string, managerId: string) {
    const db = getDbClient();
    const res = await db.query<{
      employment_id: string;
      person_id: string;
      first_name: string;
      last_name: string;
      email: string;
      job_title: string;
      status: EmploymentStatus;
    }>(
      `SELECT e.id AS employment_id, p.id AS person_id, p.first_name, p.last_name, p.email, e.job_title, e.status
       FROM employments e
       JOIN people p ON p.id = e.person_id
       WHERE e.organization_id = $1 AND e.manager_id = $2 AND e.status != 'terminated';`,
      [organizationId, managerId]
    );

    return res.rows.map((r) => ({
      employmentId: r.employment_id,
      personId: r.person_id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      jobTitle: r.job_title,
      status: r.status,
    }));
  }
}
