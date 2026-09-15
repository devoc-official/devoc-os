export type RoleCategory =
  | 'founder'
  | 'mentor'
  | 'reviewer'
  | 'student'
  | 'employee'
  | 'developer'
  | 'project_manager'
  | 'academy_head'
  | 'admin';

export interface ActiveRoleInfo {
  category: RoleCategory;
  name: string;
  code: string;
  description: string;
  isPrimary?: boolean;
}

export interface RoleState {
  activeRoles: ActiveRoleInfo[];
  currentRole: RoleCategory | 'all';
  isMultiRole: boolean;
  isLoading: boolean;
}

export interface RoleContextType extends RoleState {
  switchRole: (role: RoleCategory | 'all') => void;
  getRoleDetails: (role: RoleCategory) => ActiveRoleInfo | undefined;
}
