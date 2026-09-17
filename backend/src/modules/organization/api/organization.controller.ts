import { Request, Response } from 'express';
import { OrganizationService } from '../application/organization.service.js';
import { AuthService } from '../../../auth/auth.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

export class OrganizationController {
  public static async bootstrap(req: Request, res: Response): Promise<void> {
    try {
      const { name, slug, adminEmail, adminPassword, adminFullName } = req.body;
      if (!name || !slug || !adminEmail || !adminPassword || !adminFullName) {
        throw new ValidationError('name, slug, adminEmail, adminPassword, and adminFullName are required');
      }

      const result = await OrganizationService.bootstrapOrganization({
        name,
        slug,
        adminEmail,
        adminPassword,
        adminFullName,
        requestId: req.requestId,
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listForUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new ValidationError('User authentication required');
      }

      const memberships = await AuthService.getUserMemberships(req.user.id);
      sendSuccess(res, memberships, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const org = await OrganizationService.getOrganization(organizationId);
      sendSuccess(res, org, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { name } = req.body;

      const updated = await OrganizationService.updateOrganization(
        organizationId,
        { name },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { status } = req.body;

      if (!status || !['active', 'suspended', 'archived'].includes(status)) {
        throw new ValidationError('Status must be active, suspended, or archived');
      }

      const updated = await OrganizationService.updateOrganizationStatus(
        organizationId,
        status,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- Memberships ---
  public static async listMemberships(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const members = await OrganizationService.listMemberships(organizationId);
      sendSuccess(res, members, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async addMembership(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const { userEmail, role } = req.body;

      if (!userEmail || !role || !['org_admin', 'org_member'].includes(role)) {
        throw new ValidationError('userEmail and valid role (org_admin or org_member) are required');
      }

      const member = await OrganizationService.addMembership(
        organizationId,
        { userEmail, role },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, member, 201);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateMembership(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const membershipId = (Array.isArray(req.params.membershipId) ? req.params.membershipId[0] : req.params.membershipId) as string;
      const { role, status } = req.body;

      const updated = await OrganizationService.updateMembership(
        organizationId,
        membershipId,
        { role, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async removeMembership(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const membershipId = (Array.isArray(req.params.membershipId) ? req.params.membershipId[0] : req.params.membershipId) as string;

      await OrganizationService.removeMembership(
        organizationId,
        membershipId,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, { message: 'Membership removed successfully' }, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
