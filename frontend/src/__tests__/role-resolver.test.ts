import { describe, it, expect } from 'vitest';
import { resolveRolesFromBackend } from '../roles/role-resolver';
import { PersonRole } from '../api/people.api';
import { UserMembershipInfo } from '../api/auth.api';

describe('Role Resolver & Multi-Role Support', () => {
  it('resolves multiple simultaneous active roles from backend person_roles', () => {
    const roles: PersonRole[] = [
      {
        id: 'pr-1',
        organizationId: 'org-1',
        personId: 'p-1',
        roleId: 'r-founder',
        roleCode: 'ROLE-FOUNDER',
        roleName: 'Founder',
        status: 'active',
        startDate: '2026-01-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'pr-2',
        organizationId: 'org-1',
        personId: 'p-1',
        roleId: 'r-mentor',
        roleCode: 'ROLE-MENTOR',
        roleName: 'Mentor',
        status: 'active',
        startDate: '2026-01-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const membership: UserMembershipInfo = {
      membershipId: 'mem-1',
      organizationId: 'org-1',
      organizationName: 'DeVoc Tech',
      organizationSlug: 'devoc-tech',
      role: 'org_admin',
      status: 'active',
    };

    const resolved = resolveRolesFromBackend(roles, membership);

    // Should contain founder, mentor, and admin
    const categories = resolved.map((r) => r.category);
    expect(categories).toContain('founder');
    expect(categories).toContain('mentor');
    expect(categories).toContain('admin');
    expect(resolved.length).toBe(3);
  });

  it('filters out non-active role assignments', () => {
    const roles: PersonRole[] = [
      {
        id: 'pr-1',
        organizationId: 'org-1',
        personId: 'p-1',
        roleId: 'r-student',
        roleCode: 'ROLE-STUDENT',
        roleName: 'Student',
        status: 'active',
        startDate: '2026-01-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'pr-2',
        organizationId: 'org-1',
        personId: 'p-1',
        roleId: 'r-dev',
        roleCode: 'ROLE-DEVELOPER',
        roleName: 'Developer',
        status: 'ended', // historical ended role
        startDate: '2025-01-01',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-06-01T00:00:00Z',
      },
    ];

    const resolved = resolveRolesFromBackend(roles, null);

    expect(resolved.length).toBe(1);
    expect(resolved[0].category).toBe('student');
  });

  it('falls back to default employee role if user has no explicit person_roles assigned', () => {
    const resolved = resolveRolesFromBackend([], null);

    expect(resolved.length).toBe(1);
    expect(resolved[0].category).toBe('employee');
    expect(resolved[0].isPrimary).toBe(true);
  });
});
