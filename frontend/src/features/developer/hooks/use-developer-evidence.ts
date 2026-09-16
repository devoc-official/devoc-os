'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { workApi, WorkRecord, WorkEvidence } from '../../../api/work.api';

export interface DeveloperEvidenceItem {
  id: string;
  title: string;
  evidenceUrl?: string | null;
  workId: string;
  workTitle: string;
  createdAt: string;
}

export function useDeveloperEvidence() {
  const { currentOrganization, person } = useAuth();
  const orgId = currentOrganization?.organizationId;
  const personId = person?.id;

  const {
    data: workRecords = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['developer', 'evidence-work', orgId, personId],
    queryFn: async () => {
      if (!orgId) return [];
      try {
        return await workApi.listWorkRecords(orgId, { personId });
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId),
  });

  const evidenceItems: DeveloperEvidenceItem[] = [];

  workRecords.forEach((w) => {
    // If metadata contains evidence list
    const meta = w.metadata as any;
    if (meta?.evidence && Array.isArray(meta.evidence)) {
      meta.evidence.forEach((ev: any, idx: number) => {
        evidenceItems.push({
          id: ev.id || `${w.id}-meta-${idx}`,
          title: ev.title || 'Technical Deliverable',
          evidenceUrl: ev.url || ev.evidenceUrl,
          workId: w.id,
          workTitle: w.title,
          createdAt: w.createdAt,
        });
      });
    }
  });

  return {
    evidenceItems,
    workRecords,
    isLoading,
    refetch,
  };
}
