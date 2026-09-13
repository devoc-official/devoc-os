import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, NotFoundError } from '../../../shared/errors/index.js';
import { sendError } from '../../../shared/http/envelope.js';
import { getDbClient } from '../../../database/index.js';
import { ContextualAuthScope } from '../application/query-builder.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireAnalyticsPermission(permission: 'analytics:view' | 'analytics:define') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.user?.isPlatformAdmin) {
        return next();
      }

      if (!req.tenantContext) {
        throw new ForbiddenError('Tenant context is required for authorization');
      }

      if (permission === 'analytics:define') {
        if (req.tenantContext.role !== 'org_admin') {
          throw new ForbiddenError('Permission analytics:define required for this operation');
        }
      } else if (permission === 'analytics:view') {
        if (req.tenantContext.role !== 'org_admin' && req.tenantContext.role !== 'org_member') {
          throw new ForbiddenError('Permission analytics:view required for this operation');
        }
      }

      next();
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };
}

export async function validateBusinessUnitTenant(organizationId: string, buId: string): Promise<void> {
  if (!UUID_REGEX.test(buId)) {
    throw new NotFoundError(`Business unit '${buId}' not found`);
  }
  const db = getDbClient();
  const res = await db.query<any>('SELECT organization_id FROM business_units WHERE id = $1', [buId]);
  if (res.rows.length === 0 || res.rows[0].organization_id !== organizationId) {
    throw new NotFoundError(`Business unit '${buId}' not found`);
  }
}

export async function validateTeamTenant(organizationId: string, teamId: string): Promise<void> {
  if (!UUID_REGEX.test(teamId)) {
    throw new NotFoundError(`Team '${teamId}' not found`);
  }
  const db = getDbClient();
  const res = await db.query<any>('SELECT organization_id FROM teams WHERE id = $1', [teamId]);
  if (res.rows.length === 0 || res.rows[0].organization_id !== organizationId) {
    throw new NotFoundError(`Team '${teamId}' not found`);
  }
}

export async function validateProjectTenant(organizationId: string, projectId: string): Promise<void> {
  if (!UUID_REGEX.test(projectId)) {
    throw new NotFoundError(`Project '${projectId}' not found`);
  }
  const db = getDbClient();
  const res = await db.query<any>('SELECT organization_id FROM projects WHERE id = $1', [projectId]);
  if (res.rows.length === 0 || res.rows[0].organization_id !== organizationId) {
    throw new NotFoundError(`Project '${projectId}' not found`);
  }
}

export async function resolveContextualAuthScope(
  req: Request,
  organizationId: string
): Promise<ContextualAuthScope> {
  const db = getDbClient();
  const userId = req.user?.id;
  const isPlatformAdmin = req.user?.isPlatformAdmin === true;
  const role = req.tenantContext?.role || 'org_member';

  // Read requested context headers (may only express a requested filter/context)
  const rawBuHeader = req.headers['x-business-unit-id'];
  const rawProjectHeader = req.headers['x-project-id'];
  const rawTeamHeader = req.headers['x-team-id'];
  const rawPersonHeader = req.headers['x-person-id'];

  const requestedBuIds = rawBuHeader
    ? Array.isArray(rawBuHeader)
      ? (rawBuHeader as string[])
      : [rawBuHeader as string]
    : undefined;
  const requestedProjectIds = rawProjectHeader
    ? Array.isArray(rawProjectHeader)
      ? (rawProjectHeader as string[])
      : [rawProjectHeader as string]
    : undefined;
  const requestedTeamIds = rawTeamHeader
    ? Array.isArray(rawTeamHeader)
      ? (rawTeamHeader as string[])
      : [rawTeamHeader as string]
    : undefined;

  // Validate tenant boundary for requested header entities (cross-tenant -> 404)
  if (requestedBuIds) {
    for (const buId of requestedBuIds) {
      await validateBusinessUnitTenant(organizationId, buId);
    }
  }
  if (requestedTeamIds) {
    for (const teamId of requestedTeamIds) {
      await validateTeamTenant(organizationId, teamId);
    }
  }
  if (requestedProjectIds) {
    for (const projId of requestedProjectIds) {
      await validateProjectTenant(organizationId, projId);
    }
  }

  // Resolve Person identity: User identity != Person identity.
  // Resolve through people.user_id = $userId AND organization_id = $orgId
  let personId: string | undefined = undefined;
  if (userId) {
    const personRes = await db.query<any>(
      `SELECT id FROM people WHERE organization_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`,
      [organizationId, userId]
    );
    if (personRes.rows.length > 0) {
      personId = personRes.rows[0].id;
    }
  }

  // 1. Platform Admin has unrestricted access
  if (isPlatformAdmin) {
    return {
      role: 'org_admin',
      userId,
      isPlatformAdmin: true,
      personId,
      businessUnitIds: requestedBuIds,
      teamIds: requestedTeamIds,
      projectIds: requestedProjectIds,
    };
  }

  // 2. Organization Administrator has full tenant access
  if (role === 'org_admin') {
    return {
      role: 'org_admin',
      userId,
      isPlatformAdmin: false,
      personId,
      businessUnitIds: requestedBuIds,
      teamIds: requestedTeamIds,
      projectIds: requestedProjectIds,
    };
  }

  // 3. Regular Organization Member: derive authorized scope from M1–M10 structures
  // (Role + Business Unit + Team + Project)
  if (rawPersonHeader && (!personId || rawPersonHeader !== personId)) {
    throw new ForbiddenError('Cannot access analytics for another person');
  }

  const queryPersonId = req.query?.person_id as string | undefined;
  if (queryPersonId && (!personId || queryPersonId !== personId)) {
    throw new ForbiddenError('Cannot access analytics for another person');
  }

  const allAuthorizedBuIds = new Set<string>();
  const allAuthorizedTeamIds = new Set<string>();
  const allAuthorizedProjectIds = new Set<string>();

  if (personId) {
    // A. Business Units from person_roles
    const buFromRoles = await db.query<any>(
      `SELECT DISTINCT business_unit_id FROM person_roles
       WHERE organization_id = $1 AND person_id = $2 AND status = 'active' AND business_unit_id IS NOT NULL`,
      [organizationId, personId]
    );
    for (const r of buFromRoles.rows) {
      allAuthorizedBuIds.add(r.business_unit_id);
    }

    // B. Business Units from employments
    const buFromEmployments = await db.query<any>(
      `SELECT DISTINCT business_unit_id FROM employments
       WHERE organization_id = $1 AND person_id = $2 AND status = 'active' AND business_unit_id IS NOT NULL`,
      [organizationId, personId]
    );
    for (const r of buFromEmployments.rows) {
      allAuthorizedBuIds.add(r.business_unit_id);
    }

    // C. Business Units from assignments (target_type = 'business_unit')
    const buFromAssignments = await db.query<any>(
      `SELECT DISTINCT target_id FROM assignments
       WHERE organization_id = $1 AND person_id = $2 AND target_type = 'business_unit' AND status IN ('active', 'scheduled')`,
      [organizationId, personId]
    );
    for (const r of buFromAssignments.rows) {
      allAuthorizedBuIds.add(r.target_id);
    }

    // D. Teams from person_roles
    const teamsFromRoles = await db.query<any>(
      `SELECT DISTINCT team_id FROM person_roles
       WHERE organization_id = $1 AND person_id = $2 AND status = 'active' AND team_id IS NOT NULL`,
      [organizationId, personId]
    );
    for (const r of teamsFromRoles.rows) {
      allAuthorizedTeamIds.add(r.team_id);
    }

    // E. Teams from assignments (target_type = 'team')
    const teamsFromAssignments = await db.query<any>(
      `SELECT DISTINCT target_id FROM assignments
       WHERE organization_id = $1 AND person_id = $2 AND target_type = 'team' AND status IN ('active', 'scheduled')`,
      [organizationId, personId]
    );
    for (const r of teamsFromAssignments.rows) {
      allAuthorizedTeamIds.add(r.target_id);
    }

    // F. Projects from project_owners
    const projFromOwners = await db.query<any>(
      `SELECT DISTINCT project_id FROM project_owners
       WHERE organization_id = $1 AND person_id = $2`,
      [organizationId, personId]
    );
    for (const r of projFromOwners.rows) {
      allAuthorizedProjectIds.add(r.project_id);
    }

    // G. Projects from assignments (target_type = 'project')
    const projFromAssignments = await db.query<any>(
      `SELECT DISTINCT target_id FROM assignments
       WHERE organization_id = $1 AND person_id = $2 AND target_type = 'project' AND status IN ('active', 'scheduled')`,
      [organizationId, personId]
    );
    for (const r of projFromAssignments.rows) {
      allAuthorizedProjectIds.add(r.target_id);
    }
  }

  // Validate requested headers against actual authorized scope:
  // User requests BU-A -> Is BU-A authorized? YES -> apply, NO -> reject (403)
  let effectiveBuIds: string[] | undefined = undefined;
  if (requestedBuIds) {
    for (const buId of requestedBuIds) {
      if (!allAuthorizedBuIds.has(buId)) {
        throw new ForbiddenError('Access to requested business unit is unauthorized');
      }
    }
    effectiveBuIds = requestedBuIds;
  } else if (allAuthorizedBuIds.size > 0) {
    effectiveBuIds = Array.from(allAuthorizedBuIds);
  }

  let effectiveTeamIds: string[] | undefined = undefined;
  if (requestedTeamIds) {
    for (const teamId of requestedTeamIds) {
      if (!allAuthorizedTeamIds.has(teamId)) {
        throw new ForbiddenError('Access to requested team is unauthorized');
      }
    }
    effectiveTeamIds = requestedTeamIds;
  } else if (allAuthorizedTeamIds.size > 0) {
    effectiveTeamIds = Array.from(allAuthorizedTeamIds);
  }

  let effectiveProjectIds: string[] | undefined = undefined;
  if (requestedProjectIds) {
    for (const projId of requestedProjectIds) {
      if (!allAuthorizedProjectIds.has(projId)) {
        throw new ForbiddenError('Access to requested project is unauthorized');
      }
    }
    effectiveProjectIds = requestedProjectIds;
  } else if (allAuthorizedProjectIds.size > 0) {
    effectiveProjectIds = Array.from(allAuthorizedProjectIds);
  }

  return {
    role: 'org_member',
    userId,
    isPlatformAdmin: false,
    personId,
    businessUnitIds: effectiveBuIds,
    teamIds: effectiveTeamIds,
    projectIds: effectiveProjectIds,
    allAuthorizedBusinessUnitIds: Array.from(allAuthorizedBuIds),
    allAuthorizedTeamIds: Array.from(allAuthorizedTeamIds),
    allAuthorizedProjectIds: Array.from(allAuthorizedProjectIds),
  };
}

export function validateContextualFilters(
  filters: Record<string, any> | undefined,
  authScope: ContextualAuthScope
): void {
  if (!filters || typeof filters !== 'object') {
    return;
  }

  if (authScope.isPlatformAdmin || authScope.role === 'org_admin') {
    return;
  }

  // For org_member:
  // 1. Check person_id / personId impersonation
  const requestedPersonId = filters.person_id || filters.personId;
  if (requestedPersonId) {
    const pId = typeof requestedPersonId === 'string' ? requestedPersonId : requestedPersonId.eq;
    if (typeof pId === 'string' && (!authScope.personId || pId !== authScope.personId)) {
      throw new ForbiddenError('Cannot access analytics for another person');
    }
  }

  // 2. Check business_unit_id
  if (filters.business_unit_id) {
    const rawBu = typeof filters.business_unit_id === 'string' ? filters.business_unit_id : filters.business_unit_id.eq;
    if (typeof rawBu === 'string') {
      if (!authScope.allAuthorizedBusinessUnitIds?.includes(rawBu)) {
        throw new ForbiddenError('Access to requested business unit is unauthorized');
      }
    }
  }

  // 3. Check team_id
  if (filters.team_id) {
    const rawTeam = typeof filters.team_id === 'string' ? filters.team_id : filters.team_id.eq;
    if (typeof rawTeam === 'string') {
      if (!authScope.allAuthorizedTeamIds?.includes(rawTeam)) {
        throw new ForbiddenError('Access to requested team is unauthorized');
      }
    }
  }

  // 4. Check project_id
  if (filters.project_id) {
    const rawProj = typeof filters.project_id === 'string' ? filters.project_id : filters.project_id.eq;
    if (typeof rawProj === 'string') {
      if (!authScope.allAuthorizedProjectIds?.includes(rawProj)) {
        throw new ForbiddenError('Access to requested project is unauthorized');
      }
    }
  }
}

export function extractAuthScope(req: Request): ContextualAuthScope {
  return {
    role: req.tenantContext?.role || 'org_member',
    userId: req.user?.id,
    isPlatformAdmin: req.user?.isPlatformAdmin || false,
  };
}
