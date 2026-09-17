import { Router } from 'express';
import { PeopleController } from './people.controller.js';
import { EmploymentController } from './employment.controller.js';
import { SkillController } from './skill.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireOrgAdmin, requireRole } from '../../../permissions/permissions.middleware.js';

export const peopleRouter = Router();

// All tenant-scoped People Engine endpoints require authentication & tenant resolution
const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

// --- People Endpoints ---
tenantProtected.get('/people', requireRole(['org_admin', 'org_member']), PeopleController.listPeople);
tenantProtected.post('/people', requireOrgAdmin, PeopleController.createPerson);
tenantProtected.get('/people/:id', requireRole(['org_admin', 'org_member']), PeopleController.getPerson);
tenantProtected.patch('/people/:id', requireOrgAdmin, PeopleController.updatePerson);
tenantProtected.delete('/people/:id', requireOrgAdmin, PeopleController.archivePerson);

// --- Roles & Person Roles ---
tenantProtected.get('/roles', requireRole(['org_admin', 'org_member']), PeopleController.listRoles);
tenantProtected.post('/roles', requireOrgAdmin, PeopleController.createRole);
tenantProtected.get('/roles/:id', requireRole(['org_admin', 'org_member']), PeopleController.getRole);
tenantProtected.patch('/roles/:id', requireOrgAdmin, PeopleController.updateRole);
tenantProtected.post('/people/:personId/roles', requireOrgAdmin, PeopleController.assignPersonRole);
tenantProtected.get('/people/:personId/roles', requireRole(['org_admin', 'org_member']), PeopleController.listPersonRoles);
tenantProtected.post('/person-roles/:id/end', requireOrgAdmin, PeopleController.endPersonRole);

// --- Employments & History & Hierarchy ---
tenantProtected.get('/employments', requireRole(['org_admin', 'org_member']), EmploymentController.listEmployments);
tenantProtected.post('/employments', requireOrgAdmin, EmploymentController.createEmployment);
tenantProtected.get('/employments/:id', requireRole(['org_admin', 'org_member']), EmploymentController.getEmployment);
tenantProtected.patch('/employments/:id', requireOrgAdmin, EmploymentController.updateEmployment);
tenantProtected.post('/employments/:id/status', requireOrgAdmin, EmploymentController.updateStatus);
tenantProtected.get('/employments/:id/history', requireRole(['org_admin', 'org_member']), EmploymentController.getHistory);
tenantProtected.get('/people/:personId/direct-reports', requireRole(['org_admin', 'org_member']), EmploymentController.getDirectReports);

// --- Skills & Person Skills ---
tenantProtected.get('/skills', requireRole(['org_admin', 'org_member']), SkillController.listSkills);
tenantProtected.post('/skills', requireOrgAdmin, SkillController.createSkill);
tenantProtected.get('/skills/:id', requireRole(['org_admin', 'org_member']), SkillController.getSkill);
tenantProtected.post('/people/:personId/skills', requireOrgAdmin, SkillController.assignPersonSkill);
tenantProtected.get('/people/:personId/skills', requireRole(['org_admin', 'org_member']), SkillController.listPersonSkills);
tenantProtected.delete('/person-skills/:id', requireOrgAdmin, SkillController.removePersonSkill);

peopleRouter.use(tenantProtected);
