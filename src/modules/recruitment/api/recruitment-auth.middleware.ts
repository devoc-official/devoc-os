import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../../shared/errors/index.js';
import { sendError } from '../../../shared/http/envelope.js';

export type RecruitmentPermission =
  | 'recruitment:view'
  | 'recruitment:create'
  | 'recruitment:manage'
  | 'recruitment:admin'
  | 'recruitment:assess'
  | 'recruitment:decide'
  | 'recruitment:offer';

export function requireRecruitmentPermission(permission: RecruitmentPermission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.user?.isPlatformAdmin) {
        return next();
      }

      if (!req.tenantContext) {
        throw new ForbiddenError('Tenant context is required for authorization');
      }

      const role = req.tenantContext.role;

      if (permission === 'recruitment:admin' || permission === 'recruitment:decide') {
        if (role !== 'org_admin') {
          throw new ForbiddenError(`Permission ${permission} required for this operation`);
        }
      } else {
        // recruitment:view, recruitment:create, recruitment:manage, recruitment:assess, recruitment:offer
        if (role !== 'org_admin' && role !== 'org_member') {
          throw new ForbiddenError(`Permission ${permission} required for this operation`);
        }
      }

      next();
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  };
}
