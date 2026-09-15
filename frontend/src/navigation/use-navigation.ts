import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useRole } from '../roles/role.context';
import { usePermissions } from '../permissions/use-permissions';
import { NavItem, NavSection, RoleNavigationConfig } from './navigation.types';
import { ROLE_NAVIGATION_REGISTRY, UNIFIED_NAV_SECTIONS } from './navigation.registry';

export interface UseNavigationResult {
  sections: NavSection[];
  activeRoleConfig: RoleNavigationConfig | null;
  currentRole: string;
  isItemActive: (item: NavItem) => boolean;
  flattenedItems: NavItem[];
}

export function useNavigation(): UseNavigationResult {
  const { currentRole } = useRole();
  const { hasCapability } = usePermissions();
  const pathname = usePathname() || '/';

  const activeRoleConfig = useMemo(() => {
    if (currentRole === 'all') return null;
    return ROLE_NAVIGATION_REGISTRY[currentRole] || null;
  }, [currentRole]);

  const sections = useMemo(() => {
    const rawSections = currentRole === 'all'
      ? UNIFIED_NAV_SECTIONS
      : (ROLE_NAVIGATION_REGISTRY[currentRole]?.sections || UNIFIED_NAV_SECTIONS);

    // Filter items based on capability requirements
    return rawSections
      .map((section) => {
        const filteredItems = section.items.filter((item) => {
          if (!item.requiredCapability) return true;
          return hasCapability(item.requiredCapability);
        });
        return {
          ...section,
          items: filteredItems,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [currentRole, hasCapability]);

  const isItemActive = (item: NavItem): boolean => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const flattenedItems = useMemo(() => {
    const items: NavItem[] = [];
    sections.forEach((sec) => {
      sec.items.forEach((item) => {
        items.push(item);
        if (item.children) {
          items.push(...item.children);
        }
      });
    });
    return items;
  }, [sections]);

  return {
    sections,
    activeRoleConfig,
    currentRole,
    isItemActive,
    flattenedItems,
  };
}
