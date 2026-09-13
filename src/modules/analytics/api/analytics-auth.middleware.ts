import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../../shared/errors/index.js';
import { sendError } from '../../../shared/http/envelope.js';
import { ContextualAuthScope } from '../application/query-builder.js';

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

export function extractAuthScope(req: Request): ContextualAuthScope {
  const buHeader = req.headers['x-business-unit-id'];
  const projectHeader = req.headers['x-project-id'];
  const teamHeader = req.headers['x-team-id'];

  return {
    role: req.tenantContext?.role || 'org_member',
    isPlatformAdmin: req.user?.isPlatformAdmin || false,
    businessUnitIds: buHeader
      ? Array.isArray(buHeader)
        ? buHeader
        : [buHeader as string]
      : undefined,
    projectIds: projectHeader
      ? Array.isArray(projectHeader)
        ? projectHeader
        : [projectHeader as string]
      : undefined,
    teamIds: teamHeader
      ? Array.isArray(teamHeader)
        ? teamHeader
        : [teamHeader as string]
      : undefined,
    personId: req.user?.id,
  };
}
