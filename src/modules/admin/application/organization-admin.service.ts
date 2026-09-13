import { getDbClient, withTransaction } from '../../../database/index.js';
import { OrganizationRepository } from '../../organization/infrastructure/organization.repository.js';
import { OrganizationProps } from '../../organization/domain/organization.entity.js';
import { SettingsService } from './settings.service.js';
import { OrganizationSettingsProps } from '../domain/organization-settings.entity.js';
import { PeopleService } from '../../people/application/people.service.js';
import { OrganizationService } from '../../organization/application/organization.service.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { eventBus } from '../../../events/event-bus.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../../shared/errors/index.js';

export interface AssignRoleInput {
  roleId: string;
  businessUnitId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  startDate?: Date;
  endDate?: Date;
}

export class OrganizationAdminService {
  // --- ORGANIZATION PROFILE ---
  public static async getOrganizationProfile(organizationId: string): Promise<{
    organization: OrganizationProps;
    settings: OrganizationSettingsProps;
  }> {
    const org = await OrganizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError(`Organization '${organizationId}' not found`);
    }

    const settings = await SettingsService.getSettings(organizationId);
    return { organization: org, settings };
  }

  public static async updateOrganizationProfile(
    organizationId: string,
    data: { name?: string },
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ): Promise<OrganizationProps> {
    const org = await OrganizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundError(`Organization '${organizationId}' not found`);
    }

    const name = data.name?.trim();
    if (!name) {
      throw new ValidationError('Organization name cannot be empty');
    }

    const db = getDbClient();
    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `UPDATE organizations
         SET name = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, slug, status, created_at, updated_at;`,
        [name, organizationId]
      );

      const updated: OrganizationProps = {
        id: res.rows[0].id,
        name: res.rows[0].name,
        slug: res.rows[0].slug,
        status: res.rows[0].status,
        createdAt: new Date(res.rows[0].created_at),
        updatedAt: new Date(res.rows[0].updated_at),
      };

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'ORGANIZATION_PROFILE_UPDATED',
        entityType: 'organization',
        entityId: organizationId,
        beforeState: { name: org.name },
        afterState: { name: updated.name },
        payload: { name: updated.name },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return updated;
    });
  }

  // --- PERSON <-> USER IDENTITY LINKING ---
  public static async linkUserToPerson(
    organizationId: string,
    personId: string,
    userId: string,
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ): Promise<{ personId: string; userId: string }> {
    const db = getDbClient();

    // 1. Verify Person exists in this organization
    const personRes = await db.query<any>(
      `SELECT id, user_id, email, first_name, last_name
       FROM people
       WHERE id = $1 AND organization_id = $2;`,
      [personId, organizationId]
    );
    if (personRes.rows.length === 0) {
      throw new NotFoundError(`Person '${personId}' not found in this organization`);
    }
    const person = personRes.rows[0];
    if (person.user_id) {
      throw new ConflictError(`Person '${personId}' is already linked to user account '${person.user_id}'`);
    }

    // 2. Verify User exists and is an active member of this organization
    const userRes = await db.query<any>(
      `SELECT u.id, u.email, m.status
       FROM users u
       JOIN organization_memberships m ON m.user_id = u.id
       WHERE u.id = $1 AND m.organization_id = $2 AND u.is_active = TRUE;`,
      [userId, organizationId]
    );
    if (userRes.rows.length === 0) {
      throw new NotFoundError(`User '${userId}' not found or has no active membership in this organization`);
    }

    // 3. Verify User is not already linked to another Person in this organization (1:1 constraint)
    const collisionRes = await db.query<any>(
      `SELECT id FROM people WHERE organization_id = $1 AND user_id = $2;`,
      [organizationId, userId]
    );
    if (collisionRes.rows.length > 0) {
      throw new ConflictError(`User '${userId}' is already linked to person '${collisionRes.rows[0].id}' in this organization`);
    }

    // 4. Atomic link mutation
    return await withTransaction(async (txClient) => {
      await txClient.query(
        `UPDATE people
         SET user_id = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3;`,
        [userId, personId, organizationId]
      );

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'PERSON_USER_LINKED',
        entityType: 'person',
        entityId: personId,
        afterState: { userId },
        payload: { personId, userId },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'person.user_linked',
        entityType: 'person',
        entityId: personId,
        actorId,
        payload: { organizationId, personId, userId },
        requestId,
        correlationId,
        dbClient: txClient,
      });

      eventBus.publish({
        eventName: 'person.user_linked',
        organizationId,
        actorId,
        entityType: 'person',
        entityId: personId,
        payload: { organizationId, personId, userId },
        requestId,
        correlationId,
      });

      return { personId, userId };
    });
  }

  public static async unlinkUserFromPerson(
    organizationId: string,
    personId: string,
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ): Promise<{ personId: string; previousUserId: string }> {
    const db = getDbClient();

    const personRes = await db.query<any>(
      `SELECT id, user_id FROM people WHERE id = $1 AND organization_id = $2;`,
      [personId, organizationId]
    );
    if (personRes.rows.length === 0) {
      throw new NotFoundError(`Person '${personId}' not found in this organization`);
    }

    const previousUserId = personRes.rows[0].user_id;
    if (!previousUserId) {
      throw new ValidationError(`Person '${personId}' is not linked to any user account`);
    }

    return await withTransaction(async (txClient) => {
      await txClient.query(
        `UPDATE people
         SET user_id = NULL, updated_at = NOW()
         WHERE id = $1 AND organization_id = $2;`,
        [personId, organizationId]
      );

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'PERSON_USER_UNLINKED',
        entityType: 'person',
        entityId: personId,
        beforeState: { userId: previousUserId },
        afterState: { userId: null },
        payload: { personId, previousUserId },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'person.user_unlinked',
        entityType: 'person',
        entityId: personId,
        actorId,
        payload: { organizationId, personId, previousUserId },
        requestId,
        correlationId,
        dbClient: txClient,
      });

      eventBus.publish({
        eventName: 'person.user_unlinked',
        organizationId,
        actorId,
        entityType: 'person',
        entityId: personId,
        payload: { organizationId, personId, previousUserId },
        requestId,
        correlationId,
      });

      return { personId, previousUserId };
    });
  }

  // --- CONTEXTUAL ROLES ---
  public static async assignContextualRole(
    organizationId: string,
    personId: string,
    input: AssignRoleInput,
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ) {
    const db = getDbClient();

    // Verify Person in tenant
    const personRes = await db.query(
      `SELECT id FROM people WHERE id = $1 AND organization_id = $2;`,
      [personId, organizationId]
    );
    if (personRes.rows.length === 0) {
      throw new NotFoundError(`Person '${personId}' not found in this organization`);
    }

    // Verify Role in tenant
    const roleRes = await db.query(
      `SELECT id FROM roles WHERE id = $1 AND organization_id = $2;`,
      [input.roleId, organizationId]
    );
    if (roleRes.rows.length === 0) {
      throw new NotFoundError(`Role '${input.roleId}' not found in this organization`);
    }

    // Verify Business Unit if passed
    if (input.businessUnitId) {
      const buRes = await db.query(
        `SELECT id FROM business_units WHERE id = $1 AND organization_id = $2;`,
        [input.businessUnitId, organizationId]
      );
      if (buRes.rows.length === 0) {
        throw new NotFoundError(`Business Unit '${input.businessUnitId}' not found in this organization`);
      }
    }

    // Verify Team if passed
    if (input.teamId) {
      const teamRes = await db.query(
        `SELECT id FROM teams WHERE id = $1 AND organization_id = $2;`,
        [input.teamId, organizationId]
      );
      if (teamRes.rows.length === 0) {
        throw new NotFoundError(`Team '${input.teamId}' not found in this organization`);
      }
    }

    // Verify Department if passed
    if (input.departmentId) {
      const deptRes = await db.query(
        `SELECT id FROM departments WHERE id = $1 AND organization_id = $2;`,
        [input.departmentId, organizationId]
      );
      if (deptRes.rows.length === 0) {
        throw new NotFoundError(`Department '${input.departmentId}' not found in this organization`);
      }
    }

    return await withTransaction(async (txClient) => {
      const personRole = await PeopleService.assignRoleToPerson(
        organizationId,
        personId,
        {
          roleId: input.roleId,
          businessUnitId: input.businessUnitId,
          departmentId: input.departmentId,
          teamId: input.teamId,
          startDate: input.startDate,
        },
        actorId,
        requestId
      );

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'ROLE_CONTEXT_ASSIGNED',
        entityType: 'person_role',
        entityId: personRole.id,
        payload: {
          personId,
          roleId: input.roleId,
          businessUnitId: input.businessUnitId,
          teamId: input.teamId,
        },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'role.context_assigned',
        entityType: 'person_role',
        entityId: personRole.id,
        actorId,
        payload: { organizationId, personId, roleId: input.roleId },
        requestId,
        correlationId,
        dbClient: txClient,
      });

      eventBus.publish({
        eventName: 'role.context_assigned',
        organizationId,
        actorId,
        entityType: 'person_role',
        entityId: personRole.id,
        payload: { organizationId, personId, roleId: input.roleId },
        requestId,
        correlationId,
      });

      return personRole;
    });
  }

  public static async endContextualRole(
    organizationId: string,
    personId: string,
    personRoleId: string,
    actorId?: string,
    requestId?: string
  ) {
    const db = getDbClient();
    const roleRes = await db.query(
      `SELECT id FROM person_roles WHERE id = $1 AND person_id = $2 AND organization_id = $3;`,
      [personRoleId, personId, organizationId]
    );
    if (roleRes.rows.length === 0) {
      throw new NotFoundError(`Contextual role '${personRoleId}' not found for person in this organization`);
    }

    return PeopleService.endPersonRole(organizationId, personRoleId, actorId, requestId);
  }

  // --- MEMBERSHIP ADMINISTRATION ---
  public static async listMembers(organizationId: string) {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT m.id, m.user_id, m.role, m.status, m.created_at, m.updated_at,
              u.email, u.full_name,
              p.id as person_id, p.first_name, p.last_name
       FROM organization_memberships m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN people p ON p.user_id = u.id AND p.organization_id = m.organization_id
       WHERE m.organization_id = $1
       ORDER BY m.created_at ASC;`,
      [organizationId]
    );

    return res.rows.map((r) => ({
      membershipId: r.id,
      userId: r.user_id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      status: r.status,
      linkedPerson: r.person_id
        ? { id: r.person_id, firstName: r.first_name, lastName: r.last_name }
        : null,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  }

  public static async inviteMember(
    organizationId: string,
    userEmail: string,
    role: 'org_admin' | 'org_member' = 'org_member',
    actorId?: string,
    requestId?: string
  ) {
    return OrganizationService.addMembership(organizationId, { userEmail, role });
  }

  public static async updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: 'org_admin' | 'org_member',
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ) {
    const db = getDbClient();
    const memberRes = await db.query<any>(
      `SELECT id, role, status FROM organization_memberships WHERE organization_id = $1 AND user_id = $2;`,
      [organizationId, userId]
    );
    if (memberRes.rows.length === 0) {
      throw new NotFoundError(`Member with user ID '${userId}' not found in this organization`);
    }

    const previousRole = memberRes.rows[0].role;
    if (previousRole === newRole) {
      return memberRes.rows[0];
    }

    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `UPDATE organization_memberships
         SET role = $1, updated_at = NOW()
         WHERE organization_id = $2 AND user_id = $3
         RETURNING id, organization_id, user_id, role, status, updated_at;`,
        [newRole, organizationId, userId]
      );

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'MEMBER_ROLE_UPDATED',
        entityType: 'organization_membership',
        entityId: res.rows[0].id,
        beforeState: { role: previousRole },
        afterState: { role: newRole },
        payload: { userId, previousRole, newRole },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      return res.rows[0];
    });
  }

  public static async updateMemberStatus(
    organizationId: string,
    userId: string,
    newStatus: 'active' | 'suspended',
    actorId?: string,
    requestId?: string,
    correlationId?: string
  ) {
    const db = getDbClient();
    const memberRes = await db.query<any>(
      `SELECT id, role, status FROM organization_memberships WHERE organization_id = $1 AND user_id = $2;`,
      [organizationId, userId]
    );
    if (memberRes.rows.length === 0) {
      throw new NotFoundError(`Member with user ID '${userId}' not found in this organization`);
    }

    const previousStatus = memberRes.rows[0].status;
    if (previousStatus === newStatus) {
      return memberRes.rows[0];
    }

    return await withTransaction(async (txClient) => {
      const res = await txClient.query<any>(
        `UPDATE organization_memberships
         SET status = $1, updated_at = NOW()
         WHERE organization_id = $2 AND user_id = $3
         RETURNING id, organization_id, user_id, role, status, updated_at;`,
        [newStatus, organizationId, userId]
      );

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: 'MEMBER_STATUS_UPDATED',
        entityType: 'organization_membership',
        entityId: res.rows[0].id,
        beforeState: { status: previousStatus },
        afterState: { status: newStatus },
        payload: { userId, previousStatus, newStatus },
        requestId,
        correlationId,
        sourceModule: 'admin',
        dbClient: txClient,
      });

      if (newStatus === 'suspended') {
        await OutboxService.stageOutboxEvent({
          organizationId,
          eventName: 'membership.suspended',
          entityType: 'organization_membership',
          entityId: res.rows[0].id,
          actorId,
          payload: { organizationId, userId, status: newStatus },
          requestId,
          correlationId,
          dbClient: txClient,
        });

        eventBus.publish({
          eventName: 'membership.suspended',
          organizationId,
          actorId,
          entityType: 'organization_membership',
          entityId: res.rows[0].id,
          payload: { organizationId, userId, status: newStatus },
          requestId,
          correlationId,
        });
      }

      return res.rows[0];
    });
  }
}
