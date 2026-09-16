'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { adminApi, AdminAuditLog } from '../../../api/admin.api';

export interface AuditFilters {
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
}

export function useAdminAudit() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const [filters, setFilters] = useState<AuditFilters>({
    action: '',
    actorId: '',
    startDate: '',
    endDate: '',
    limit: 50,
    offset: 0,
  });

  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'audit-logs', orgId, filters],
    queryFn: () =>
      adminApi.listAuditLogs(orgId, {
        action: filters.action || undefined,
        actorId: filters.actorId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        limit: filters.limit,
        offset: filters.offset,
      }),
    enabled: Boolean(orgId),
  });

  const updateFilters = (newFilters: Partial<AuditFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const resetFilters = () => {
    setFilters({
      action: '',
      actorId: '',
      startDate: '',
      endDate: '',
      limit: 50,
      offset: 0,
    });
  };

  return {
    logs,
    filters,
    selectedLog,
    setSelectedLog,
    isLoading,
    updateFilters,
    resetFilters,
    refetch,
  };
}
