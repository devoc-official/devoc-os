import { PersonRole } from '../api/people.api';
import { UserMembershipInfo } from '../api/auth.api';
import { ActiveRoleInfo, RoleCategory } from './roles.types';

export const ROLE_METADATA: Record<RoleCategory, { name: string; description: string }> = {
  founder: {
    name: 'Founder',
    description: 'Executive leadership, strategic initiatives, and company-wide oversight',
  },
  mentor: {
    name: 'Mentor',
    description: 'Student guidance, roadmap coaching, and milestone reviews',
  },
  reviewer: {
    name: 'Reviewer',
    description: 'Qualitative milestone assessment and suggestion feedback',
  },
  student: {
    name: 'Student',
    description: 'Self-paced learning journey, exercises, and milestone submissions',
  },
  employee: {
    name: 'Employee',
    description: 'Day-to-day organizational work, presence, and contributions',
  },
  developer: {
    name: 'Developer',
    description: 'Software development, task execution, and codebase contributions',
  },
  project_manager: {
    name: 'Project Manager',
    description: 'Sprint planning, project backlogs, and team delivery',
  },
  academy_head: {
    name: 'Academy Head',
    description: 'Curriculum standards, mentor allocations, and cohort placement',
  },
  admin: {
    name: 'Administrator',
    description: 'Organization settings, membership provisioning, and security controls',
  },
};

export function resolveRolesFromBackend(
  personRoles: PersonRole[] = [],
  membership?: UserMembershipInfo | null
): ActiveRoleInfo[] {
  const resolved = new Map<RoleCategory, ActiveRoleInfo>();

  // 1. Resolve from active PersonRole records
  for (const pr of personRoles) {
    if (pr.status !== 'active') continue;

    const code = (pr.roleCode || '').toUpperCase();
    let category: RoleCategory | null = null;

    if (code === 'ROLE-FOUNDER' || code.includes('FOUNDER')) {
      category = 'founder';
    } else if (code === 'ROLE-MENTOR' || code.includes('MENTOR')) {
      category = 'mentor';
    } else if (code === 'ROLE-REVIEWER' || code.includes('REVIEWER')) {
      category = 'reviewer';
    } else if (code === 'ROLE-STUDENT' || code.includes('STUDENT')) {
      category = 'student';
    } else if (code.includes('DEV') || code.includes('ENGINEER')) {
      category = 'developer';
    } else if (code.includes('PM') || code.includes('PROJECT_MANAGER')) {
      category = 'project_manager';
    } else if (code.includes('ACADEMY_HEAD') || code.includes('HEAD')) {
      category = 'academy_head';
    } else if (code.includes('ADMIN')) {
      category = 'admin';
    } else {
      category = 'employee';
    }

    if (category && !resolved.has(category)) {
      resolved.set(category, {
        category,
        name: ROLE_METADATA[category].name,
        code: pr.roleCode || category.toUpperCase(),
        description: ROLE_METADATA[category].description,
      });
    }
  }

  // 2. Resolve admin capability from organization membership
  if (membership?.role === 'org_admin' && !resolved.has('admin')) {
    resolved.set('admin', {
      category: 'admin',
      name: ROLE_METADATA.admin.name,
      code: 'ROLE-ORG-ADMIN',
      description: ROLE_METADATA.admin.description,
    });
  }

  // 3. Fallback: if no roles resolved, default to employee
  if (resolved.size === 0) {
    resolved.set('employee', {
      category: 'employee',
      name: ROLE_METADATA.employee.name,
      code: 'ROLE-EMPLOYEE',
      description: ROLE_METADATA.employee.description,
      isPrimary: true,
    });
  }

  return Array.from(resolved.values());
}
