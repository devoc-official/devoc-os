import { requireCapability, Capability } from '../../../permissions/permissions.middleware.js';

export type RecruitmentPermission =
  | 'recruitment:view'
  | 'recruitment:create'
  | 'recruitment:manage'
  | 'recruitment:admin'
  | 'recruitment:assess'
  | 'recruitment:decide'
  | 'recruitment:offer';

export function requireRecruitmentPermission(permission: RecruitmentPermission) {
  return requireCapability(permission as Capability);
}
