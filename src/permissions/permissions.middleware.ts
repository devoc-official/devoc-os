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

export type Capability =
  | 'recruitment:view'
  | 'recruitment:create'
  | 'recruitment:manage'
  | 'recruitment:admin'
  | 'recruitment:assess'
  | 'recruitment:decide'
  | 'recruitment:offer'
  | 'analytics:view'
  | 'analytics:define';

export const ROLE_CAPABILITY_MAP: Record<'org_admin' | 'org_member', Capability[]> = {
  org_admin: [
    'recruitment:view',
    'recruitment:create',
    'recruitment:manage',
    'recruitment:admin',
    'recruitment:assess',
    'recruitment:decide',
    'recruitment:offer',
    'analytics:view',
    'analytics:define',
  ],
  org_member: [
    'recruitment:view',
    'recruitment:create',
    'recruitment:manage',
    'recruitment:assess',
    'recruitment:offer',
    'analytics:view',
  ],
};

export function hasCapability(role: 'org_admin' | 'org_member', capability: Capability): boolean {
  const allowed = ROLE_CAPABILITY_MAP[role] || [];
  return allowed.includes(capability);
}

export const requireCapability = (capability: Capability) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.user?.isPlatformAdmin) {
        return next();
      }

      if (!req.tenantContext) {
        throw new ForbiddenError('Tenant context is required for authorization');
      }

      if (!hasCapability(req.tenantContext.role, capability)) {
        throw new ForbiddenError(`Permission ${capability} required for this operation`);
      }

      next();
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };
};
