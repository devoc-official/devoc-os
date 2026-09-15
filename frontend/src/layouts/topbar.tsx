import React, { useState, useEffect } from 'react';
import { Menu, Search, Sun, Moon, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../auth/use-auth';
import { Breadcrumbs } from './breadcrumbs';
import { ContextSwitcher } from './context-switcher';
import { RoleSwitcher } from './role-switcher';
import { DropdownMenu, DropdownMenuItem } from '../components/ui/dropdown-menu';
import { Avatar } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

export interface TopBarProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
  className?: string;
}

export function TopBar({
  onOpenMobileSidebar,
  onOpenCommandPalette,
  className,
}: TopBarProps) {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check document dark mode class
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('devoc-theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('devoc-theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const userMenuItems: DropdownMenuItem[] = [
    {
      id: 'user-identity',
      label: (
        <div className="flex flex-col py-0.5">
          <span className="font-semibold text-xs text-devoc-text-primary">
            {user?.fullName || 'Authorized User'}
          </span>
          <span className="text-[10px] text-devoc-text-secondary truncate">
            {user?.email || 'user@devoc.io'}
          </span>
        </div>
      ),
    },
    {
      id: 'divider-user',
      label: '',
      divider: true,
    },
    {
      id: 'user-profile',
      label: 'My Profile',
      icon: <UserIcon className="h-3.5 w-3.5" />,
      onClick: () => {
        window.location.href = '/profile';
      },
    },
    {
      id: 'user-logout',
      label: 'Sign Out',
      icon: <LogOut className="h-3.5 w-3.5" />,
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-devoc-border bg-devoc-surface px-4 sm:px-6',
        className
      )}
    >
      {/* Left section: mobile hamburger, breadcrumbs, context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-xs text-devoc-text-secondary hover:bg-devoc-surface-secondary hover:text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-brand-ring"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden sm:block">
          <ContextSwitcher />
        </div>

        <div className="hidden md:flex items-center">
          <span className="text-devoc-border-strong mx-2">/</span>
          <Breadcrumbs />
        </div>
      </div>

      {/* Right section: CommandPalette, RoleSwitcher, Theme, User */}
      <div className="flex items-center gap-2.5">
        {/* Command palette search trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex h-8 items-center gap-2 rounded-md border border-devoc-border bg-devoc-surface-secondary/70 px-2.5 text-xs text-devoc-text-tertiary hover:border-devoc-border-strong hover:text-devoc-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-devoc-brand-ring"
          aria-label="Open command palette (Press Cmd+K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-xs border border-devoc-border bg-devoc-surface px-1 py-0.2 text-[10px] font-mono text-devoc-text-tertiary">
            ⌘K
          </kbd>
        </button>

        {/* Role Switcher */}
        <RoleSwitcher />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 text-devoc-text-secondary hover:text-devoc-text-primary"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User avatar and menu */}
        <DropdownMenu
          trigger={
            <button
              type="button"
              className="flex items-center rounded-sm focus:outline-none focus:ring-2 focus:ring-devoc-brand-ring"
              aria-label="Open user menu"
            >
              <Avatar name={user?.fullName || 'User'} size="sm" />
            </button>
          }
          items={userMenuItems}
          align="right"
          className="w-52"
        />
      </div>
    </header>
  );
}
