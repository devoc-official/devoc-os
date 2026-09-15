import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../lib/utils';

export interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const pathname = usePathname() || '/';
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs text-devoc-text-secondary', className)}>
        <span className="flex items-center gap-1 font-medium text-devoc-text-primary">
          <Home className="h-3.5 w-3.5" />
          Dashboard
        </span>
      </nav>
    );
  }

  const formatSegment = (seg: string) => {
    return seg
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-1.5 text-xs text-devoc-text-tertiary', className)}>
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-devoc-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-devoc-brand-ring rounded-xs"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Dashboard</span>
      </Link>

      {segments.map((seg, idx) => {
        const href = `/${segments.slice(0, idx + 1).join('/')}`;
        const isLast = idx === segments.length - 1;

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3.5 w-3.5 text-devoc-text-disabled shrink-0" aria-hidden="true" />
            {isLast ? (
              <span
                aria-current="page"
                className="font-medium text-devoc-text-primary truncate max-w-[150px] sm:max-w-none"
              >
                {formatSegment(seg)}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-devoc-text-primary transition-colors truncate max-w-[120px] sm:max-w-none focus:outline-none focus:ring-1 focus:ring-devoc-brand-ring rounded-xs"
              >
                {formatSegment(seg)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
