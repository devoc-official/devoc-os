import { Router } from 'express';
import { ProjectController } from './project.controller.js';
import { TaskController } from './task.controller.js';
import { authenticate } from '../../../auth/auth.middleware.js';
import { resolveTenant } from '../../../tenant/tenant.middleware.js';
import { requireOrgAdmin, requireRole } from '../../../permissions/permissions.middleware.js';

export const projectsTasksRouter = Router();

const tenantProtected = Router();
tenantProtected.use(authenticate, resolveTenant);

// --- PROJECTS ENDPOINTS ---

// CRUD
tenantProtected.get('/projects', requireRole(['org_admin', 'org_member']), ProjectController.listProjects);
tenantProtected.post('/projects', requireRole(['org_admin', 'org_member']), ProjectController.createProject);
tenantProtected.get('/projects/:projectId', requireRole(['org_admin', 'org_member']), ProjectController.getProjectById);
tenantProtected.patch('/projects/:projectId', requireRole(['org_admin', 'org_member']), ProjectController.updateProject);
tenantProtected.post('/projects/:projectId/status', requireRole(['org_admin', 'org_member']), ProjectController.transitionProjectStatus);

// Explicit Project Lifecycle Transitions
tenantProtected.post('/projects/:projectId/research', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('research'));
tenantProtected.post('/projects/:projectId/plan', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('planning'));
tenantProtected.post('/projects/:projectId/develop', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('development'));
tenantProtected.post('/projects/:projectId/test', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('testing'));
tenantProtected.post('/projects/:projectId/beta', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('beta'));
tenantProtected.post('/projects/:projectId/release', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('released'));
tenantProtected.post('/projects/:projectId/maintenance', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('maintenance'));
tenantProtected.post('/projects/:projectId/archive', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('archived'));

// Project Owners
tenantProtected.get('/projects/:projectId/owners', requireRole(['org_admin', 'org_member']), ProjectController.listOwners);
tenantProtected.post('/projects/:projectId/owners', requireRole(['org_admin', 'org_member']), ProjectController.addOwner);
tenantProtected.delete('/projects/:projectId/owners/:ownerId', requireRole(['org_admin', 'org_member']), ProjectController.removeOwner);

// Project Business Units
tenantProtected.get('/projects/:projectId/business-units', requireRole(['org_admin', 'org_member']), ProjectController.listBusinessUnits);
tenantProtected.post('/projects/:projectId/business-units', requireRole(['org_admin', 'org_member']), ProjectController.linkBusinessUnit);
tenantProtected.post('/projects/:projectId/business-units/:businessUnitId', requireRole(['org_admin', 'org_member']), ProjectController.linkBusinessUnit);
tenantProtected.delete('/projects/:projectId/business-units/:businessUnitId', requireRole(['org_admin', 'org_member']), ProjectController.unlinkBusinessUnit);

// Project Sub-Resources
tenantProtected.get('/projects/:projectId/tasks', requireRole(['org_admin', 'org_member']), ProjectController.listProjectTasks);
tenantProtected.get('/projects/:projectId/assignments', requireRole(['org_admin', 'org_member']), ProjectController.listProjectAssignments);

// Explicit /organizations/:organizationId/projects variants
tenantProtected.get('/organizations/:organizationId/projects', requireRole(['org_admin', 'org_member']), ProjectController.listProjects);
tenantProtected.post('/organizations/:organizationId/projects', requireRole(['org_admin', 'org_member']), ProjectController.createProject);
tenantProtected.get('/organizations/:organizationId/projects/:projectId', requireRole(['org_admin', 'org_member']), ProjectController.getProjectById);
tenantProtected.patch('/organizations/:organizationId/projects/:projectId', requireRole(['org_admin', 'org_member']), ProjectController.updateProject);
tenantProtected.post('/organizations/:organizationId/projects/:projectId/status', requireRole(['org_admin', 'org_member']), ProjectController.transitionProjectStatus);

tenantProtected.post('/organizations/:organizationId/projects/:projectId/research', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('research'));
tenantProtected.post('/organizations/:organizationId/projects/:projectId/plan', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('planning'));
tenantProtected.post('/organizations/:organizationId/projects/:projectId/develop', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('development'));
tenantProtected.post('/organizations/:organizationId/projects/:projectId/test', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('testing'));
tenantProtected.post('/organizations/:organizationId/projects/:projectId/beta', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('beta'));
tenantProtected.post('/organizations/:organizationId/projects/:projectId/release', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('released'));
tenantProtected.post('/organizations/:organizationId/projects/:projectId/maintenance', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('maintenance'));
tenantProtected.post('/organizations/:organizationId/projects/:projectId/archive', requireRole(['org_admin', 'org_member']), ProjectController.createTransitionHandler('archived'));

tenantProtected.get('/organizations/:organizationId/projects/:projectId/owners', requireRole(['org_admin', 'org_member']), ProjectController.listOwners);
tenantProtected.post('/organizations/:organizationId/projects/:projectId/owners', requireRole(['org_admin', 'org_member']), ProjectController.addOwner);
tenantProtected.delete('/organizations/:organizationId/projects/:projectId/owners/:ownerId', requireRole(['org_admin', 'org_member']), ProjectController.removeOwner);

tenantProtected.get('/organizations/:organizationId/projects/:projectId/business-units', requireRole(['org_admin', 'org_member']), ProjectController.listBusinessUnits);
tenantProtected.post('/organizations/:organizationId/projects/:projectId/business-units/:businessUnitId', requireRole(['org_admin', 'org_member']), ProjectController.linkBusinessUnit);
tenantProtected.delete('/organizations/:organizationId/projects/:projectId/business-units/:businessUnitId', requireRole(['org_admin', 'org_member']), ProjectController.unlinkBusinessUnit);

tenantProtected.get('/organizations/:organizationId/projects/:projectId/tasks', requireRole(['org_admin', 'org_member']), ProjectController.listProjectTasks);
tenantProtected.get('/organizations/:organizationId/projects/:projectId/assignments', requireRole(['org_admin', 'org_member']), ProjectController.listProjectAssignments);


// --- TASKS ENDPOINTS ---

// CRUD
tenantProtected.get('/tasks', requireRole(['org_admin', 'org_member']), TaskController.listTasks);
tenantProtected.post('/tasks', requireRole(['org_admin', 'org_member']), TaskController.createTask);
tenantProtected.get('/tasks/:taskId', requireRole(['org_admin', 'org_member']), TaskController.getTaskById);
tenantProtected.patch('/tasks/:taskId', requireRole(['org_admin', 'org_member']), TaskController.updateTask);
tenantProtected.post('/tasks/:taskId/status', requireRole(['org_admin', 'org_member']), TaskController.transitionTaskStatus);

// Explicit Task Lifecycle Transitions
tenantProtected.post('/tasks/:taskId/todo', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('todo'));
tenantProtected.post('/tasks/:taskId/start', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('in_progress'));
tenantProtected.post('/tasks/:taskId/review', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('in_review'));
tenantProtected.post('/tasks/:taskId/test', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('testing'));
tenantProtected.post('/tasks/:taskId/block', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('blocked'));
tenantProtected.post('/tasks/:taskId/changes-requested', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('changes_requested'));
tenantProtected.post('/tasks/:taskId/done', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('done'));
tenantProtected.post('/tasks/:taskId/cancel', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('cancelled'));

// Task Hierarchy & Dependencies
tenantProtected.get('/tasks/:taskId/children', requireRole(['org_admin', 'org_member']), TaskController.listChildTasks);
tenantProtected.get('/tasks/:taskId/dependencies', requireRole(['org_admin', 'org_member']), TaskController.listDependencies);
tenantProtected.post('/tasks/:taskId/dependencies', requireRole(['org_admin', 'org_member']), TaskController.addDependency);
tenantProtected.delete('/tasks/:taskId/dependencies/:dependencyId', requireRole(['org_admin', 'org_member']), TaskController.removeDependency);

// Task Assignments
tenantProtected.get('/tasks/:taskId/assignments', requireRole(['org_admin', 'org_member']), TaskController.listTaskAssignments);

// Explicit /organizations/:organizationId/tasks variants
tenantProtected.get('/organizations/:organizationId/tasks', requireRole(['org_admin', 'org_member']), TaskController.listTasks);
tenantProtected.post('/organizations/:organizationId/tasks', requireRole(['org_admin', 'org_member']), TaskController.createTask);
tenantProtected.get('/organizations/:organizationId/tasks/:taskId', requireRole(['org_admin', 'org_member']), TaskController.getTaskById);
tenantProtected.patch('/organizations/:organizationId/tasks/:taskId', requireRole(['org_admin', 'org_member']), TaskController.updateTask);
tenantProtected.post('/organizations/:organizationId/tasks/:taskId/status', requireRole(['org_admin', 'org_member']), TaskController.transitionTaskStatus);

tenantProtected.post('/organizations/:organizationId/tasks/:taskId/todo', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('todo'));
tenantProtected.post('/organizations/:organizationId/tasks/:taskId/start', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('in_progress'));
tenantProtected.post('/organizations/:organizationId/tasks/:taskId/review', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('in_review'));
tenantProtected.post('/organizations/:organizationId/tasks/:taskId/test', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('testing'));
tenantProtected.post('/organizations/:organizationId/tasks/:taskId/block', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('blocked'));
tenantProtected.post('/organizations/:organizationId/tasks/:taskId/changes-requested', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('changes_requested'));
tenantProtected.post('/organizations/:organizationId/tasks/:taskId/done', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('done'));
tenantProtected.post('/organizations/:organizationId/tasks/:taskId/cancel', requireRole(['org_admin', 'org_member']), TaskController.createTransitionHandler('cancelled'));

tenantProtected.get('/organizations/:organizationId/tasks/:taskId/children', requireRole(['org_admin', 'org_member']), TaskController.listChildTasks);
tenantProtected.get('/organizations/:organizationId/tasks/:taskId/dependencies', requireRole(['org_admin', 'org_member']), TaskController.listDependencies);
tenantProtected.post('/organizations/:organizationId/tasks/:taskId/dependencies', requireRole(['org_admin', 'org_member']), TaskController.addDependency);
tenantProtected.delete('/organizations/:organizationId/tasks/:taskId/dependencies/:dependencyId', requireRole(['org_admin', 'org_member']), TaskController.removeDependency);

tenantProtected.get('/organizations/:organizationId/tasks/:taskId/assignments', requireRole(['org_admin', 'org_member']), TaskController.listTaskAssignments);

projectsTasksRouter.use(tenantProtected);
