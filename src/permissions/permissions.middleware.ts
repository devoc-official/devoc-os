import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors/index.js';
import { sendError } from '../shared/http/envelope.js';

export const requireRole = (allowedRoles: Array<'org_admin' | 'org_member'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.user?.isPlatformAdmin) {
        return next();
      }

      if (!req.tenantContext) {
        throw new ForbiddenError('Tenant context is required for authorization');
      }

      if (!allowedRoles.includes(req.tenantContext.role)) {
        throw new ForbiddenError(`Action requires one of the following roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };
};

export const requireOrgAdmin = requireRole(['org_admin']);

export const requirePlatformAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user || !req.user.isPlatformAdmin) {
      throw new ForbiddenError('Action requires platform administrator privileges');
    }
    next();
  } catch (err) {
    sendError(res, err as Error, req.requestId);
  }
};
