'use client';

import React, { useState, useMemo } from 'react';
import { WorkRecord, WorkCategory, WorkStatus } from '../../../api/work.api';
import { Project } from '../../../api/projects.api';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Search, Clock, Send, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface WorkTableProps {
  records: WorkRecord[];
  categories?: WorkCategory[];
  projects?: Project[];
  isLoading?: boolean;
  onRecordClick?: (record: WorkRecord) => void;
  onSubmitWork?: (record: WorkRecord) => Promise<void>;
  onApproveWork?: (record: WorkRecord) => Promise<void>;
  onRejectWork?: (record: WorkRecord) => Promise<void>;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  canApprove?: boolean;
}

export function WorkTable({
  records,
  categories = [],
  projects = [],
  isLoading = false,
  onRecordClick,
  onSubmitWork,
  onApproveWork,
  onRejectWork,
  emptyTitle = 'No work records found',
  emptyDescription = 'There are currently no logged work contributions matching your filter.',
  className,
  canApprove = false,
}: WorkTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const categoryMap = useMemo(() => {
    const map = new Map<string, WorkCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const category = categoryMap.get(r.categoryId);
        const matchesCategory = category?.name.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesCategory) return false;
      }
      return true;
    });
  }, [records, statusFilter, searchQuery, categoryMap]);

  const columns: Column<WorkRecord>[] = [
    {
      key: 'title',
      header: 'Contribution',
      render: (record) => (
        <div>
          <div className="font-medium text-devoc-text-primary">{record.title}</div>
          {record.description && (
            <p className="text-[11px] text-devoc-text-muted line-clamp-1">{record.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'categoryId',
      header: 'Category',
      width: '130px',
      render: (record) => {
        const cat = categoryMap.get(record.categoryId);
        return (
          <span className="text-[11px] text-devoc-text-secondary font-medium truncate block">
            {cat?.name || 'General'}
          </span>
        );
      },
    },
    {
      key: 'target',
      header: 'Target',
      width: '140px',
      render: (record) => {
        if (!record.targetId) return <span className="text-devoc-text-muted text-[11px]">—</span>;
        const proj = projectMap.get(record.targetId);
        return (
          <span className="text-[11px] text-devoc-text-secondary truncate block max-w-[130px]">
            {proj ? proj.name : `${record.targetType || 'Target'}: #${record.targetId.slice(0, 6)}`}
          </span>
        );
      },
    },
    {
      key: 'durationMinutes',
      header: 'Duration',
      width: '90px',
      render: (record) => (
        <span className="font-mono text-[11px] text-devoc-text-primary font-medium">
          {formatDuration(record.durationMinutes)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (record) => <StatusBadge status={record.status} />,
    },
    {
      key: 'createdAt',
      header: 'Logged Date',
      width: '110px',
      render: (record) => (
        <span className="text-[11px] text-devoc-text-secondary">
          {new Date(record.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      render: (record) => {
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {record.status === 'draft' && onSubmitWork && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2"
                onClick={() => onSubmitWork(record)}
              >
                <Send className="h-2.5 w-2.5 mr-1 text-blue-600" />
                Submit
              </Button>
            )}

            {canApprove && record.status === 'submitted' && (
              <>
                {onApproveWork && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-1.5 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => onApproveWork(record)}
                    title="Approve Work"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </Button>
                )}
                {onRejectWork && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-1.5 text-red-700 hover:bg-red-50"
                    onClick={() => onRejectWork(record)}
                    title="Reject Work"
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contributions..."
            className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
            aria-label="Filter work by status"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Primary Data Table */}
      <DataTable
        columns={columns}
        data={filteredRecords}
        keyField="id"
        isLoading={isLoading}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onRowClick={onRecordClick}
      />
    </div>
  );
}
