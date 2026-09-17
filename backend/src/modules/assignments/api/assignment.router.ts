import { Router } from 'express';
import { AssignmentController } from './assignment.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireOrgAdmin, requireRole } from '../../../permissions/permissions.middleware.js';

export const assignmentRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

// --- Standard /assignments Endpoints ---
tenantProtected.get('/assignments', requireRole(['org_admin', 'org_member']), AssignmentController.listAssignments);
tenantProtected.post('/assignments', requireOrgAdmin, AssignmentController.createAssignment);
tenantProtected.get('/assignments/:assignmentId', requireRole(['org_admin', 'org_member']), AssignmentController.getAssignment);
tenantProtected.patch('/assignments/:assignmentId', requireOrgAdmin, AssignmentController.updateAssignment);

// Lifecycle Transitions
tenantProtected.post('/assignments/:assignmentId/activate', requireOrgAdmin, AssignmentController.activateAssignment);
tenantProtected.post('/assignments/:assignmentId/pause', requireOrgAdmin, AssignmentController.pauseAssignment);
tenantProtected.post('/assignments/:assignmentId/complete', requireOrgAdmin, AssignmentController.completeAssignment);
tenantProtected.post('/assignments/:assignmentId/cancel', requireOrgAdmin, AssignmentController.cancelAssignment);

// History & Person Assignments
tenantProtected.get('/assignments/:assignmentId/history', requireRole(['org_admin', 'org_member']), AssignmentController.getAssignmentHistory);
tenantProtected.get('/people/:personId/assignments', requireRole(['org_admin', 'org_member']), AssignmentController.getPersonAssignments);

// --- Explicit /organizations/:organizationId/assignments Endpoints ---
tenantProtected.get('/organizations/:organizationId/assignments', requireRole(['org_admin', 'org_member']), AssignmentController.listAssignments);
tenantProtected.post('/organizations/:organizationId/assignments', requireOrgAdmin, AssignmentController.createAssignment);
tenantProtected.get('/organizations/:organizationId/assignments/:assignmentId', requireRole(['org_admin', 'org_member']), AssignmentController.getAssignment);
tenantProtected.patch('/organizations/:organizationId/assignments/:assignmentId', requireOrgAdmin, AssignmentController.updateAssignment);

tenantProtected.post('/organizations/:organizationId/assignments/:assignmentId/activate', requireOrgAdmin, AssignmentController.activateAssignment);
tenantProtected.post('/organizations/:organizationId/assignments/:assignmentId/pause', requireOrgAdmin, AssignmentController.pauseAssignment);
tenantProtected.post('/organizations/:organizationId/assignments/:assignmentId/complete', requireOrgAdmin, AssignmentController.completeAssignment);
tenantProtected.post('/organizations/:organizationId/assignments/:assignmentId/cancel', requireOrgAdmin, AssignmentController.cancelAssignment);

tenantProtected.get('/organizations/:organizationId/assignments/:assignmentId/history', requireRole(['org_admin', 'org_member']), AssignmentController.getAssignmentHistory);
tenantProtected.get('/organizations/:organizationId/people/:personId/assignments', requireRole(['org_admin', 'org_member']), AssignmentController.getPersonAssignments);

assignmentRouter.use(tenantProtected);
