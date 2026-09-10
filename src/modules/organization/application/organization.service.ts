import { withTransaction } from '../../../database/index.js';
import { AuthService } from '../../../auth/auth.service.js';
import { OrganizationRepository } from '../infrastructure/organization.repository.js';
import { OrganizationEntity, OrganizationProps, OrganizationStatus } from '../domain/organization.entity.js';
import { eventBus } from '../../../events/event-bus.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/index.js';

export class OrganizationService {
  public static async bootstrapOrganization(data: {
    name: string;
    slug: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
    requestId?: string;
  }): Promise<{ organization: OrganizationProps; adminUser: { id: string; email: string } }> {
    OrganizationEntity.validateSlug(data.slug);

    const existingSlug = await OrganizationRepository.findBySlug(data.slug);
    if (existingSlug) {
      throw new ConflictError(`Organization slug '${data.slug}' is already taken`);
    }

    return await withTransaction(async (txClient) => {
      let adminUser = await AuthService.getUserByEmail(data.adminEmail);
      if (!adminUser) {
        adminUser = await AuthService.createUser({
          email: data.adminEmail,
          password: data.adminPassword,
          fullName: data.adminFullName,
        });
      }

      const organization = await OrganizationRepository.create(
        { name: data.name, slug: data.slug, status: 'active' },
        txClient
      );

      await OrganizationRepository.createMembership(
        {
          organizationId: organization.id,
          userId: adminUser.id,
          role: 'org_admin',
          status: 'active',
        },
        txClient
      );

      eventBus.publish({
        eventName: 'OrganizationCreated',
        organizationId: organization.id,
        actorId: adminUser.id,
        entityType: 'Organization',
        entityId: organization.id,
        payload: { name: organization.name, slug: organization.slug },
        requestId: data.requestId,
      });

      eventBus.publish({
        eventName: 'MembershipCreated',
        organizationId: organization.id,
        actorId: adminUser.id,
        entityType: 'OrganizationMembership',
        payload: { userId: adminUser.id, role: 'org_admin' },
        requestId: data.requestId,
      });

      return {
        organization,
        adminUser: { id: adminUser.id, email: adminUser.email },
      };
    });
  }

  public static async getOrganization(id: string): Promise<OrganizationProps> {
    const org = await OrganizationRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    return org;
  }

  public static async updateOrganization(
    id: string,
    data: { name?: string },
    actorId?: string,
    requestId?: string
  ): Promise<OrganizationProps> {
    const org = await this.getOrganization(id);
    const updated = await OrganizationRepository.update(id, data);

    eventBus.publish({
      eventName: 'OrganizationUpdated',
      organizationId: id,
      actorId,
      entityType: 'Organization',
      entityId: id,
      payload: data,
      requestId,
    });

    return updated;
  }

  public static async updateOrganizationStatus(
    id: string,
    nextStatus: OrganizationStatus,
    actorId?: string,
    requestId?: string
  ): Promise<OrganizationProps> {
    const orgData = await this.getOrganization(id);
    const entity = new OrganizationEntity(orgData);
    entity.validateStatusTransition(nextStatus);

    const updated = await OrganizationRepository.update(id, { status: nextStatus });

    eventBus.publish({
      eventName: 'OrganizationStatusChanged',
      organizationId: id,
      actorId,
      entityType: 'Organization',
      entityId: id,
      payload: { previousStatus: orgData.status, newStatus: nextStatus },
      requestId,
    });

    return updated;
  }

  public static async addMembership(
    organizationId: string,
    data: { userEmail: string; role: 'org_admin' | 'org_member' },
    actorId?: string,
    requestId?: string
  ) {
    const db = (await import('../../../database/index.js')).getDbClient();
    const userRes = await db.query<{ id: string }>('SELECT id FROM users WHERE email = $1;', [
      data.userEmail.toLowerCase().trim(),
    ]);

    if (userRes.rows.length === 0) {
      throw new NotFoundError(`User with email '${data.userEmail}' does not exist`);
    }

    const userId = userRes.rows[0].id;
    const existing = await OrganizationRepository.findMembership(organizationId, userId);
    if (existing) {
      throw new ConflictError('User is already a member of this organization');
    }

    const membership = await OrganizationRepository.createMembership({
      organizationId,
      userId,
      role: data.role,
      status: 'active',
    });

    eventBus.publish({
      eventName: 'MembershipCreated',
      organizationId,
      actorId,
      entityType: 'OrganizationMembership',
      entityId: membership.id,
      payload: { userId, role: data.role },
      requestId,
    });

    return membership;
  }

  public static async listMemberships(organizationId: string) {
    return OrganizationRepository.listMembershipsForOrg(organizationId);
  }

  public static async updateMembership(
    organizationId: string,
    membershipId: string,
    data: { role?: 'org_admin' | 'org_member'; status?: 'active' | 'suspended' | 'invited' },
    actorId?: string,
    requestId?: string
  ) {
    const updated = await OrganizationRepository.updateMembership(membershipId, organizationId, data);

    eventBus.publish({
      eventName: 'MembershipUpdated',
      organizationId,
      actorId,
      entityType: 'OrganizationMembership',
      entityId: membershipId,
      payload: data,
      requestId,
    });

    return updated;
  }

  public static async removeMembership(
    organizationId: string,
    membershipId: string,
    actorId?: string,
    requestId?: string
  ) {
    const deleted = await OrganizationRepository.deleteMembership(membershipId, organizationId);
    if (!deleted) {
      throw new NotFoundError('Membership not found in active organization context');
    }

    eventBus.publish({
      eventName: 'MembershipRemoved',
      organizationId,
      actorId,
      entityType: 'OrganizationMembership',
      entityId: membershipId,
      requestId,
    });

    return true;
  }
}
