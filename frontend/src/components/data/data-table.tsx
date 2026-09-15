import React from 'react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from './empty-state';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T | ((row: T) => string);
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are currently no items to display in this table.',
  onRowClick,
  className,
}: DataTableProps<T>) {
  const getKey = (row: T): string => {
    if (typeof keyField === 'function') {
      return keyField(row);
    }
    return String(row[keyField]);
  };

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  return (
    <div className={cn('w-full overflow-x-auto rounded-md border border-devoc-border bg-devoc-surface', className)}>
      <table className="w-full text-xs text-devoc-text-primary border-collapse">
        <thead>
          <tr className="border-b border-devoc-border bg-devoc-surface-secondary text-devoc-text-secondary font-medium">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  'px-3.5 py-2.5 uppercase tracking-wider font-semibold text-[11px]',
                  getAlignClass(col.align),
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-devoc-border/60">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <tr key={idx} className="h-10">
                {columns.map((col) => (
                  <td key={col.key} className="px-3.5 py-2.5">
                    <Skeleton className="h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center">
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const rowKey = getKey(row);
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors hover:bg-devoc-surface-secondary/60',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => {
                    const content = col.render
                      ? col.render(row)
                      : (row as Record<string, any>)[col.key];

                    return (
                      <td
                        key={col.key}
                        className={cn('px-3.5 py-2.5 align-middle', getAlignClass(col.align), col.className)}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
