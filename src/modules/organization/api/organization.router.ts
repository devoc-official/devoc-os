import { Router } from 'express';
import { OrganizationController } from './organization.controller.js';
import { StructureController } from './structure.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireOrgAdmin, requireRole } from '../../../permissions/permissions.middleware.js';
import { AuditService } from '../../../audit/audit.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';

export const organizationRouter = Router();

// Bootstrap endpoint (Unauthenticated or platform admin)
organizationRouter.post('/organizations/bootstrap', OrganizationController.bootstrap);

// Public / Authenticated user org list
organizationRouter.get('/organizations', authenticate, OrganizationController.listForUser);

// All tenant-scoped organization endpoints require authentication & tenant resolution
const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

// Organization management
tenantProtected.get('/organizations/:id', requireRole(['org_admin', 'org_member']), OrganizationController.getById);
tenantProtected.patch('/organizations/:id', requireOrgAdmin, OrganizationController.update);
tenantProtected.post('/organizations/:id/status', requireOrgAdmin, OrganizationController.updateStatus);

// Organization Memberships
tenantProtected.get('/memberships', requireRole(['org_admin', 'org_member']), OrganizationController.listMemberships);
tenantProtected.post('/memberships', requireOrgAdmin, OrganizationController.addMembership);
tenantProtected.patch('/memberships/:membershipId', requireOrgAdmin, OrganizationController.updateMembership);
tenantProtected.delete('/memberships/:membershipId', requireOrgAdmin, OrganizationController.removeMembership);

// Branches
tenantProtected.get('/branches', requireRole(['org_admin', 'org_member']), StructureController.listBranches);
tenantProtected.post('/branches', requireOrgAdmin, StructureController.createBranch);
tenantProtected.get('/branches/:id', requireRole(['org_admin', 'org_member']), StructureController.getBranch);
tenantProtected.patch('/branches/:id', requireOrgAdmin, StructureController.updateBranch);

// Business Units
tenantProtected.get('/business-units', requireRole(['org_admin', 'org_member']), StructureController.listBusinessUnits);
tenantProtected.post('/business-units', requireOrgAdmin, StructureController.createBusinessUnit);
tenantProtected.get('/business-units/:id', requireRole(['org_admin', 'org_member']), StructureController.getBusinessUnit);
tenantProtected.patch('/business-units/:id', requireOrgAdmin, StructureController.updateBusinessUnit);

// Departments
tenantProtected.get('/departments', requireRole(['org_admin', 'org_member']), StructureController.listDepartments);
tenantProtected.post('/departments', requireOrgAdmin, StructureController.createDepartment);
tenantProtected.get('/departments/:id', requireRole(['org_admin', 'org_member']), StructureController.getDepartment);
tenantProtected.patch('/departments/:id', requireOrgAdmin, StructureController.updateDepartment);

// Teams
tenantProtected.get('/teams', requireRole(['org_admin', 'org_member']), StructureController.listTeams);
tenantProtected.post('/teams', requireOrgAdmin, StructureController.createTeam);
tenantProtected.get('/teams/:id', requireRole(['org_admin', 'org_member']), StructureController.getTeam);
tenantProtected.patch('/teams/:id', requireOrgAdmin, StructureController.updateTeam);

// Audit Logs
tenantProtected.get('/audit-logs', requireOrgAdmin, async (req, res) => {
  try {
    const { organizationId } = req.tenantContext!;
    const logs = await AuditService.listLogsForTenant(organizationId);
    sendSuccess(res, logs, 200);
  } catch (err) {
    sendError(res, err as Error, req.requestId);
  }
});

organizationRouter.use(tenantProtected);
