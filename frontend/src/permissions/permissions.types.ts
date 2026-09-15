export type Capability =
  | 'recruitment:view'
  | 'recruitment:create'
  | 'recruitment:manage'
  | 'recruitment:admin'
  | 'recruitment:assess'
  | 'recruitment:decide'
  | 'recruitment:offer'
  | 'workforce:view'
  | 'workforce:create'
  | 'workforce:manage'
  | 'workforce:admin'
  | 'workforce:approve'
  | 'workforce_time:view'
  | 'workforce_time:create'
  | 'workforce_time:manage'
  | 'workforce_time:approve'
  | 'workforce_time:admin'
  | 'analytics:view'
  | 'analytics:define'
  | 'admin:manage'
  | 'organization:admin';

export const ROLE_CAPABILITY_MAP: Record<'org_admin' | 'org_member', Capability[]> = {
  org_admin: [
    'recruitment:view',
    'recruitment:create',
    'recruitment:manage',
    'recruitment:admin',
    'recruitment:assess',
    'recruitment:decide',
    'recruitment:offer',
    'workforce:view',
    'workforce:create',
    'workforce:manage',
    'workforce:admin',
    'workforce:approve',
    'workforce_time:view',
    'workforce_time:create',
    'workforce_time:manage',
    'workforce_time:approve',
    'workforce_time:admin',
    'analytics:view',
    'analytics:define',
    'admin:manage',
    'organization:admin',
  ],
  org_member: [
    'recruitment:view',
    'workforce:view',
    'workforce_time:view',
    'workforce_time:create',
    'analytics:view',
  ],
};
