import { Request, Response, NextFunction } from 'express';
import { getDbClient } from '../database/index.js';
import { TenantContextRequiredError, TenantAccessDeniedError } from '../shared/errors/index.js';
import { sendError } from '../shared/http/envelope.js';

export interface TenantContext {
  organizationId: string;
  role: 'org_admin' | 'org_member';
  status: 'active' | 'suspended' | 'invited';
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export const resolveTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new TenantAccessDeniedError('User identity missing prior to tenant resolution');
    }

    const rawHeader = req.headers['x-organization-id'];
    const headerOrgId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const rawParam = req.params.organizationId || req.params.id;
    const paramOrgId = Array.isArray(rawParam) ? rawParam[0] : rawParam;

    let requestedOrgId = headerOrgId;
    if (paramOrgId && req.path.startsWith('/organizations/')) {
      if (headerOrgId && headerOrgId !== paramOrgId) {
        throw new TenantAccessDeniedError('Organization header does not match requested organization ID');
      }
      requestedOrgId = paramOrgId;
    }

    if (!requestedOrgId) {
      throw new TenantContextRequiredError('X-Organization-Id header or organization parameter is required');
    }

    const db = getDbClient();

    // Check if platform admin bypass or regular member
    if (req.user.isPlatformAdmin) {
      const orgCheck = await db.query('SELECT id FROM organizations WHERE id = $1;', [requestedOrgId]);
      if (orgCheck.rows.length === 0) {
        throw new TenantAccessDeniedError('Organization does not exist');
      }
      req.tenantContext = {
        organizationId: requestedOrgId,
        role: 'org_admin',
        status: 'active',
      };
      return next();
    }

    // Verify membership for regular users
    const memberRes = await db.query<{
      role: 'org_admin' | 'org_member';
      status: 'active' | 'suspended' | 'invited';
    }>(
      `SELECT m.role, m.status
       FROM organization_memberships m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1 AND m.organization_id = $2 AND o.status != 'archived';`,
      [req.user.id, requestedOrgId]
    );

    if (memberRes.rows.length === 0) {
      throw new TenantAccessDeniedError('Access to specified organization is denied');
    }

    const membership = memberRes.rows[0];
    if (membership.status !== 'active') {
      throw new TenantAccessDeniedError('Organization membership is not active');
    }

    req.tenantContext = {
      organizationId: requestedOrgId,
      role: membership.role,
      status: membership.status,
    };

    next();
  } catch (err) {
    sendError(res, err as Error, req.requestId);
  }
};
