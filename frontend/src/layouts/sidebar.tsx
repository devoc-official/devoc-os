import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Layers, Sparkles, X } from 'lucide-react';
import { useNavigation } from '../navigation/use-navigation';
import { useRole } from '../roles/role.context';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  className,
}: SidebarProps) {
  const { sections, isItemActive, activeRoleConfig, currentRole } = useNavigation();
  const { isMultiRole } = useRole();

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-devoc-surface border-r border-devoc-border">
      {/* Top Header: Brand and Collapse button */}
      <div>
        <div className="flex h-14 items-center justify-between px-3.5 border-b border-devoc-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 focus:outline-none focus:ring-1 focus:ring-devoc-brand-ring rounded-xs"
          >
            {/* Minimal enterprise mark */}
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-devoc-brand text-white font-mono font-bold text-xs shadow-xs">
              DV
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-tight text-devoc-text-primary">
                  DeVoc OS
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-devoc-text-tertiary">
                  Enterprise
                </span>
              </div>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded-xs text-devoc-text-tertiary hover:bg-devoc-surface-secondary hover:text-devoc-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-devoc-brand-ring"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-xs text-devoc-text-tertiary hover:bg-devoc-surface-secondary hover:text-devoc-text-primary transition-colors"
            aria-label="Close mobile menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Active Perspective Badge */}
        {!isCollapsed && (
          <div className="p-3 border-b border-devoc-border/60 bg-devoc-surface-secondary/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono font-semibold text-devoc-text-tertiary">
                Perspective
              </span>
              <Badge variant={currentRole === 'all' ? 'brand' : 'neutral'} size="sm">
                {currentRole === 'all' ? 'Unified' : 'Workspace'}
              </Badge>
            </div>
            <p className="mt-1 text-xs font-semibold text-devoc-text-primary truncate">
              {activeRoleConfig?.title || 'Unified System'}
            </p>
          </div>
        )}

        {/* Navigation items by section */}
        <nav aria-label="Main Navigation" className="p-2 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
          {sections.map((section) => (
            <div key={section.id} className="space-y-1">
              {!isCollapsed && section.title && (
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-devoc-text-tertiary">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        'flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors select-none',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-devoc-brand-ring',
                        active
                          ? 'bg-devoc-surface-secondary text-devoc-text-primary font-semibold border-l-2 border-devoc-brand rounded-l-none'
                          : 'text-devoc-text-secondary hover:bg-devoc-surface-secondary/60 hover:text-devoc-text-primary',
                        isCollapsed && 'justify-center px-2'
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            active ? 'text-devoc-brand' : 'text-devoc-text-tertiary'
                          )}
                        />
                      )}
                      {!isCollapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                      {!isCollapsed && item.badge !== undefined && (
                        <Badge variant={item.badgeVariant || 'neutral'} size="sm">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer info in sidebar */}
      {!isCollapsed && (
        <div className="p-3 border-t border-devoc-border bg-devoc-surface-secondary/40 text-[10px] text-devoc-text-tertiary flex items-center justify-between font-mono">
          <span>DeVoc OS v1.0</span>
          <span>F1.2 Foundation</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 transition-all duration-200 ease-in-out',
          isCollapsed ? 'w-14' : 'w-56',
          className
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Aside */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 shadow-modal">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
