import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Command, ArrowRight, Layers, LogOut } from 'lucide-react';
import { useNavigation } from '../navigation/use-navigation';
import { useRole } from '../roles/role.context';
import { useAuth } from '../auth/use-auth';
import { Dialog } from '../components/ui/dialog';
import { cn } from '../lib/utils';
import { RoleCategory } from '../roles/roles.types';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Role Workspace' | 'Actions';
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { flattenedItems } = useNavigation();
  const { activeRoles, switchRole } = useRole();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commandItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // 1. Navigation items
    flattenedItems.forEach((item) => {
      const Icon = item.icon;
      items.push({
        id: `nav-${item.id}`,
        category: 'Navigation',
        label: item.label,
        description: item.href,
        icon: Icon ? <Icon className="h-4 w-4" /> : undefined,
        onSelect: () => {
          router.push(item.href);
          onClose();
        },
      });
    });

    // 2. Role switching perspectives
    items.push({
      id: 'role-switch-all',
      category: 'Role Workspace',
      label: 'Switch to Unified View (All Roles)',
      description: 'Synthesized overview of all active roles',
      icon: <Layers className="h-4 w-4 text-devoc-brand" />,
      onSelect: () => {
        switchRole('all');
        router.push('/dashboard');
        onClose();
      },
    });

    activeRoles.forEach((role) => {
      items.push({
        id: `role-switch-${role.category}`,
        category: 'Role Workspace',
        label: `Enter ${role.name} Workspace`,
        description: role.description,
        icon: <Layers className="h-4 w-4 text-devoc-brand" />,
        onSelect: () => {
          switchRole(role.category);
          router.push('/dashboard');
          onClose();
        },
      });
    });

    // 3. Actions
    items.push({
      id: 'action-logout',
      category: 'Actions',
      label: 'Sign Out',
      description: 'End current session',
      icon: <LogOut className="h-4 w-4 text-devoc-status-error-text" />,
      onSelect: () => {
        logout();
        onClose();
      },
    });

    return items;
  }, [flattenedItems, activeRoles, router, switchRole, logout, onClose]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return commandItems;
    const lower = query.toLowerCase();
    return commandItems.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        (item.description && item.description.toLowerCase().includes(lower)) ||
        item.category.toLowerCase().includes(lower)
    );
  }, [commandItems, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
      }
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="md" className="p-0 overflow-hidden">
      {/* Search Input Box */}
      <div className="flex items-center px-4 border-b border-devoc-border bg-devoc-surface">
        <Search className="h-4 w-4 text-devoc-text-tertiary mr-2.5 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search commands, navigate screens, or switch roles... (Type or ↑↓)"
          className="h-12 w-full bg-transparent text-sm text-devoc-text-primary placeholder:text-devoc-text-disabled focus:outline-none"
        />
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded-xs border border-devoc-border bg-devoc-surface-secondary px-1.5 py-0.5 text-[10px] font-mono text-devoc-text-tertiary">
          ESC
        </kbd>
      </div>

      {/* Results List */}
      <div className="max-h-80 overflow-y-auto p-2">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-devoc-text-secondary">
            No matching commands or routes found for &ldquo;{query}&rdquo;
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={item.onSelect}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-sm text-xs cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-devoc-surface-secondary text-devoc-text-primary'
                    : 'text-devoc-text-secondary hover:bg-devoc-surface-secondary/60'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="text-devoc-text-tertiary shrink-0">{item.icon || <Command className="h-4 w-4" />}</div>
                  <div className="min-w-0 truncate">
                    <p className="font-medium truncate text-devoc-text-primary">{item.label}</p>
                    {item.description && (
                      <p className="text-[11px] text-devoc-text-tertiary truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-devoc-text-disabled uppercase">
                    {item.category}
                  </span>
                  {isSelected && (
                    <ArrowRight className="h-3 w-3 text-devoc-brand" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer shortcut tips */}
      <div className="flex items-center justify-between px-4 py-2 bg-devoc-surface-secondary border-t border-devoc-border text-[11px] text-devoc-text-tertiary">
        <div className="flex items-center gap-3">
          <span><kbd className="font-mono font-semibold">↑↓</kbd> to navigate</span>
          <span><kbd className="font-mono font-semibold">↵</kbd> to select</span>
          <span><kbd className="font-mono font-semibold">esc</kbd> to dismiss</span>
        </div>
        <span className="font-mono font-semibold text-devoc-brand">DeVoc OS</span>
      </div>
    </Dialog>
  );
}
