import { Router } from 'express';
import { OrganizationAdminController } from './organization-admin.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireOrgAdmin } from '../../../permissions/permissions.middleware.js';

export const adminRouter = Router();

// Organization Admin Barrier (Tenant context + Org Admin role)
adminRouter.use(authenticate, resolveTenant, requireOrgAdmin);

// 1. Organization Profile & Operational Settings
adminRouter.get('/organization', OrganizationAdminController.getOrganization);
adminRouter.patch('/organization', OrganizationAdminController.updateOrganization);
adminRouter.get('/settings', OrganizationAdminController.getSettings);
adminRouter.put('/settings', OrganizationAdminController.updateSettings);

// 2. Business Structure Administration
adminRouter.get('/branches', OrganizationAdminController.listBranches);
adminRouter.post('/branches', OrganizationAdminController.createBranch);
adminRouter.patch('/branches/:id', OrganizationAdminController.updateBranch);

adminRouter.get('/business-units', OrganizationAdminController.listBusinessUnits);
adminRouter.post('/business-units', OrganizationAdminController.createBusinessUnit);
adminRouter.patch('/business-units/:id', OrganizationAdminController.updateBusinessUnit);

adminRouter.get('/departments', OrganizationAdminController.listDepartments);
adminRouter.post('/departments', OrganizationAdminController.createDepartment);
adminRouter.patch('/departments/:id', OrganizationAdminController.updateDepartment);

adminRouter.get('/teams', OrganizationAdminController.listTeams);
adminRouter.post('/teams', OrganizationAdminController.createTeam);
adminRouter.patch('/teams/:id', OrganizationAdminController.updateTeam);

// 3. Membership Administration
adminRouter.get('/members', OrganizationAdminController.listMembers);
adminRouter.post('/invitations', OrganizationAdminController.inviteMember);
adminRouter.patch('/members/:userId/role', OrganizationAdminController.updateMemberRole);
adminRouter.patch('/members/:userId/status', OrganizationAdminController.updateMemberStatus);

// 4. Person <-> User Identity Linking & Contextual Roles
adminRouter.post('/people/:personId/link-user', OrganizationAdminController.linkUserToPerson);
adminRouter.post('/people/:personId/unlink-user', OrganizationAdminController.unlinkUserFromPerson);
adminRouter.post('/people/:personId/roles', OrganizationAdminController.assignPersonRole);
adminRouter.delete('/people/:personId/roles/:personRoleId', OrganizationAdminController.endPersonRole);

// 5. Configurable Master Data
// Work Categories
adminRouter.get('/master-data/work-categories', OrganizationAdminController.listWorkCategories);
adminRouter.post('/master-data/work-categories', OrganizationAdminController.createWorkCategory);
adminRouter.patch('/master-data/work-categories/:id', OrganizationAdminController.updateWorkCategory);
adminRouter.delete('/master-data/work-categories/:id', OrganizationAdminController.retireWorkCategory);

// Meeting Types
adminRouter.get('/master-data/meeting-types', OrganizationAdminController.listMeetingTypes);
adminRouter.post('/master-data/meeting-types', OrganizationAdminController.createMeetingType);
adminRouter.patch('/master-data/meeting-types/:id', OrganizationAdminController.updateMeetingType);
adminRouter.delete('/master-data/meeting-types/:id', OrganizationAdminController.retireMeetingType);

// Evaluation Templates
adminRouter.get('/master-data/evaluation-templates', OrganizationAdminController.listEvaluationTemplates);
adminRouter.post('/master-data/evaluation-templates', OrganizationAdminController.createEvaluationTemplate);
adminRouter.patch('/master-data/evaluation-templates/:id', OrganizationAdminController.updateEvaluationTemplate);

// Finance Categories
adminRouter.get('/master-data/finance-categories', OrganizationAdminController.listFinanceCategories);
adminRouter.post('/master-data/finance-categories', OrganizationAdminController.createFinanceCategory);
adminRouter.patch('/master-data/finance-categories/:id', OrganizationAdminController.updateFinanceCategory);
adminRouter.delete('/master-data/finance-categories/:id', OrganizationAdminController.retireFinanceCategory);

// Skills
adminRouter.get('/master-data/skills', OrganizationAdminController.listSkills);
adminRouter.post('/master-data/skills', OrganizationAdminController.createSkill);
adminRouter.patch('/master-data/skills/:id', OrganizationAdminController.updateSkill);

// 6. Feature Configurations
adminRouter.get('/features', OrganizationAdminController.listFeatures);
adminRouter.get('/features/:featureKey', OrganizationAdminController.getFeature);
adminRouter.put('/features/:featureKey', OrganizationAdminController.setFeatureOverride);
adminRouter.delete('/features/:featureKey', OrganizationAdminController.deleteFeatureOverride);

// 7. Administrative Audit Logs
adminRouter.get('/audit-logs', OrganizationAdminController.listAuditLogs);
