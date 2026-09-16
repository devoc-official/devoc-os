import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApi } from '../api/admin.api';
import { apiClient } from '../api/client';

describe('admin-tenant-isolation.test.tsx (Tenant Isolation in Admin Operations)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('enforces organizationId scoping on organization and settings operations', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({} as any);
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({} as any);
    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({} as any);

    await adminApi.getOrganizationProfile('org-tenant-a');
    expect(getSpy).toHaveBeenCalledWith('/admin/organization', { organizationId: 'org-tenant-a' });

    await adminApi.updateOrganizationProfile('org-tenant-a', { name: 'Tenant A Renamed' });
    expect(patchSpy).toHaveBeenCalledWith(
      '/admin/organization',
      { name: 'Tenant A Renamed' },
      { organizationId: 'org-tenant-a' }
    );

    await adminApi.getSettings('org-tenant-a');
    expect(getSpy).toHaveBeenCalledWith('/admin/settings', { organizationId: 'org-tenant-a' });

    await adminApi.updateSettings('org-tenant-a', { timezone: 'Europe/Paris' });
    expect(putSpy).toHaveBeenCalledWith(
      '/admin/settings',
      { timezone: 'Europe/Paris' },
      { organizationId: 'org-tenant-a' }
    );
  });

  it('enforces organizationId scoping on membership and user management', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([] as any);
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({} as any);
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({} as any);

    await adminApi.listMembers('org-tenant-a');
    expect(getSpy).toHaveBeenCalledWith('/admin/members', { organizationId: 'org-tenant-a' });

    await adminApi.inviteMember('org-tenant-a', { email: 'new@tenant-a.com', role: 'org_member' });
    expect(postSpy).toHaveBeenCalledWith(
      '/admin/invitations',
      { email: 'new@tenant-a.com', role: 'org_member' },
      { organizationId: 'org-tenant-a' }
    );

    await adminApi.updateMemberRole('org-tenant-a', 'usr-1', 'org_admin');
    expect(patchSpy).toHaveBeenCalledWith(
      '/admin/members/usr-1/role',
      { role: 'org_admin' },
      { organizationId: 'org-tenant-a' }
    );

    await adminApi.linkUserToPerson('org-tenant-a', 'p-1', 'usr-1');
    expect(postSpy).toHaveBeenCalledWith(
      '/admin/people/p-1/link-user',
      { userId: 'usr-1' },
      { organizationId: 'org-tenant-a' }
    );

    await adminApi.unlinkUserFromPerson('org-tenant-a', 'p-1');
    expect(postSpy).toHaveBeenCalledWith(
      '/admin/people/p-1/unlink-user',
      {},
      { organizationId: 'org-tenant-a' }
    );
  });

  it('enforces organizationId scoping on structural entities (branches, BUs, depts, teams)', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({} as any);

    await adminApi.createBranch('org-tenant-a', { name: 'Campus 1', code: 'C1' });
    expect(postSpy).toHaveBeenCalledWith(
      '/admin/branches',
      { name: 'Campus 1', code: 'C1' },
      { organizationId: 'org-tenant-a' }
    );

    await adminApi.createBusinessUnit('org-tenant-a', { name: 'Core Engine', code: 'CORE' });
    expect(postSpy).toHaveBeenCalledWith(
      '/admin/business-units',
      { name: 'Core Engine', code: 'CORE' },
      { organizationId: 'org-tenant-a' }
    );

    await adminApi.createDepartment('org-tenant-a', { name: 'Platform', code: 'PLAT', businessUnitId: 'bu-1' });
    expect(postSpy).toHaveBeenCalledWith(
      '/admin/departments',
      { name: 'Platform', code: 'PLAT', businessUnitId: 'bu-1' },
      { organizationId: 'org-tenant-a' }
    );

    await adminApi.createTeam('org-tenant-a', { name: 'Infra Pod', code: 'INFRA', businessUnitId: 'bu-1' });
    expect(postSpy).toHaveBeenCalledWith(
      '/admin/teams',
      { name: 'Infra Pod', code: 'INFRA', businessUnitId: 'bu-1' },
      { organizationId: 'org-tenant-a' }
    );
  });

  it('enforces organizationId scoping on master data, features, and audit logs', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([] as any);
    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({} as any);
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({} as any);

    await adminApi.listWorkCategories('org-tenant-a');
    expect(getSpy).toHaveBeenCalledWith('/admin/master-data/work-categories', {
      organizationId: 'org-tenant-a',
      params: { include_inactive: true },
    });

    await adminApi.listFeatures('org-tenant-a');
    expect(getSpy).toHaveBeenCalledWith('/admin/features', { organizationId: 'org-tenant-a' });

    await adminApi.setFeatureOverride('org-tenant-a', 'workforce.timesheets', true, { limit: 40 });
    expect(putSpy).toHaveBeenCalledWith(
      '/admin/features/workforce.timesheets',
      expect.objectContaining({ isEnabled: true }),
      { organizationId: 'org-tenant-a' }
    );

    await adminApi.deleteFeatureOverride('org-tenant-a', 'workforce.timesheets');
    expect(deleteSpy).toHaveBeenCalledWith(
      '/admin/features/workforce.timesheets',
      { organizationId: 'org-tenant-a' }
    );

    await adminApi.listAuditLogs('org-tenant-a', { limit: 20 });
    expect(getSpy).toHaveBeenCalledWith(
      '/admin/audit-logs',
      { organizationId: 'org-tenant-a', params: { limit: 20 } }
    );
  });
});
