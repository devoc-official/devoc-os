import { describe, it, expect } from 'vitest';
import { ROLE_CAPABILITY_MAP } from '../permissions/permissions.types';

describe('Permissions & Capability Mapping', () => {
  it('grants full administrative and workforce capabilities to org_admin', () => {
    const adminCapabilities = ROLE_CAPABILITY_MAP['org_admin'];

    expect(adminCapabilities).toContain('workforce_time:approve');
    expect(adminCapabilities).toContain('workforce_time:admin');
    expect(adminCapabilities).toContain('recruitment:manage');
    expect(adminCapabilities).toContain('analytics:define');
    expect(adminCapabilities).toContain('organization:admin');
  });

  it('restricts standard org_member to view/create own records without elevated admin capabilities', () => {
    const memberCapabilities = ROLE_CAPABILITY_MAP['org_member'];

    expect(memberCapabilities).toContain('workforce_time:view');
    expect(memberCapabilities).toContain('workforce_time:create');
    expect(memberCapabilities).not.toContain('workforce_time:approve');
    expect(memberCapabilities).not.toContain('workforce_time:admin');
    expect(memberCapabilities).not.toContain('organization:admin');
  });
});
