import { LucideIcon } from 'lucide-react';
import { RoleCategory } from '../roles/roles.types';
import { Capability } from '../permissions/permissions.types';
import { BadgeProps } from '../components/ui/badge';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  exact?: boolean;
  requiredCapability?: Capability;
  allowedRoles?: RoleCategory[];
  badge?: string | number;
  badgeVariant?: BadgeProps['variant'];
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
}

export interface RoleNavigationConfig {
  role: RoleCategory;
  title: string;
  description: string;
  sections: NavSection[];
}
