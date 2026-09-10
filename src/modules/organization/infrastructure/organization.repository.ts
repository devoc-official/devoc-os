import { getDbClient, DbClient } from '../../../database/index.js';
import { OrganizationProps, OrganizationStatus } from '../domain/organization.entity.js';

export interface MembershipRecord {
  id: string;
  organizationId: string;
  userId: string;
  role: 'org_admin' | 'org_member';
  status: 'active' | 'suspended' | 'invited';
  createdAt: Date;
  updatedAt: Date;
  userEmail?: string;
  userFullName?: string;
}

export class OrganizationRepository {
  public static async create(
    data: { name: string; slug: string; status?: OrganizationStatus },
    client?: DbClient
  ): Promise<OrganizationProps> {
    const db = client || getDbClient();
    const status = data.status || 'active';
    const res = await db.query<{
      id: string;
      name: string;
      slug: string;
      status: OrganizationStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO organizations (name, slug, status)
       VALUES ($1, $2, $3)
       RETURNING id, name, slug, status, created_at, updated_at;`,
      [data.name, data.slug.toLowerCase().trim(), status]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findById(id: string): Promise<OrganizationProps | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      name: string;
      slug: string;
      status: OrganizationStatus;
      created_at: Date;
      updated_at: Date;
    }>('SELECT id, name, slug, status, created_at, updated_at FROM organizations WHERE id = $1;', [id]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findBySlug(slug: string): Promise<OrganizationProps | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      name: string;
      slug: string;
      status: OrganizationStatus;
      created_at: Date;
      updated_at: Date;
    }>('SELECT id, name, slug, status, created_at, updated_at FROM organizations WHERE slug = $1;', [
      slug.toLowerCase().trim(),
    ]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async update(
    id: string,
    data: { name?: string; status?: OrganizationStatus }
  ): Promise<OrganizationProps> {
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

    const res = await db.query<{
      id: string;
      name: string;
      slug: string;
      status: OrganizationStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE organizations
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, slug, status, created_at, updated_at;`,
      values
    );

    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async createMembership(
    data: {
      organizationId: string;
      userId: string;
      role: 'org_admin' | 'org_member';
      status?: 'active' | 'suspended' | 'invited';
    },
    client?: DbClient
  ): Promise<MembershipRecord> {
    const db = client || getDbClient();
    const status = data.status || 'active';
    const res = await db.query<{
      id: string;
      organization_id: string;
      user_id: string;
      role: 'org_admin' | 'org_member';
      status: 'active' | 'suspended' | 'invited';
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, organization_id, user_id, role, status, created_at, updated_at;`,
      [data.organizationId, data.userId, data.role, status]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findMembership(
    organizationId: string,
    userId: string
  ): Promise<MembershipRecord | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      user_id: string;
      role: 'org_admin' | 'org_member';
      status: 'active' | 'suspended' | 'invited';
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, user_id, role, status, created_at, updated_at
       FROM organization_memberships
       WHERE organization_id = $1 AND user_id = $2;`,
      [organizationId, userId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listMembershipsForOrg(organizationId: string): Promise<MembershipRecord[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      user_id: string;
      role: 'org_admin' | 'org_member';
      status: 'active' | 'suspended' | 'invited';
      created_at: Date;
      updated_at: Date;
      user_email: string;
      user_full_name: string;
    }>(
      `SELECT m.id, m.organization_id, m.user_id, m.role, m.status, m.created_at, m.updated_at, u.email AS user_email, u.full_name AS user_full_name
       FROM organization_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.organization_id = $1
       ORDER BY m.created_at ASC;`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userEmail: row.user_email,
      userFullName: row.user_full_name,
    }));
  }

  public static async updateMembership(
    membershipId: string,
    organizationId: string,
    data: { role?: 'org_admin' | 'org_member'; status?: 'active' | 'suspended' | 'invited' }
  ): Promise<MembershipRecord> {
    const db = getDbClient();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    fields.push(`updated_at = NOW()`);
    values.push(membershipId);
    values.push(organizationId);

    const res = await db.query<{
      id: string;
      organization_id: string;
      user_id: string;
      role: 'org_admin' | 'org_member';
      status: 'active' | 'suspended' | 'invited';
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE organization_memberships
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
       RETURNING id, organization_id, user_id, role, status, created_at, updated_at;`,
      values
    );

    if (res.rows.length === 0) {
      throw new Error('Membership not found or tenant boundary mismatch');
    }

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async deleteMembership(membershipId: string, organizationId: string): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM organization_memberships
       WHERE id = $1 AND organization_id = $2;`,
      [membershipId, organizationId]
    );
    return res.rowCount > 0;
  }
}
