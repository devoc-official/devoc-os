'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { recruitmentApi, Position, Candidate, Application, PipelineStage } from '../../../api/recruitment.api';

export function useFounderRecruitment() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: positions = [], isLoading: isPositionsLoading } = useQuery({
    queryKey: ['founder', 'recruitment-positions', orgId],
    queryFn: () => recruitmentApi.listPositions(orgId),
    enabled: Boolean(orgId),
  });

  const { data: candidates = [], isLoading: isCandidatesLoading } = useQuery({
    queryKey: ['founder', 'recruitment-candidates', orgId],
    queryFn: () => recruitmentApi.listCandidates(orgId),
    enabled: Boolean(orgId),
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['founder', 'recruitment-stages', orgId],
    queryFn: () => recruitmentApi.listPipelineStages(orgId),
    enabled: Boolean(orgId),
  });

  const { data: applications = [], isLoading: isAppsLoading } = useQuery({
    queryKey: ['founder', 'recruitment-applications', orgId],
    queryFn: () => recruitmentApi.listApplications(orgId),
    enabled: Boolean(orgId),
  });

  const openPositions = positions.filter((p) => p.status === 'open');
  const activeApplications = applications.filter(
    (a) => a.status !== 'rejected' && a.status !== 'withdrawn' && a.status !== 'hired'
  );
  const hiredApplications = applications.filter((a) => a.status === 'hired');

  return {
    positions,
    openPositions,
    candidates,
    stages,
    applications,
    activeApplications,
    hiredApplications,
    isLoading: isPositionsLoading || isCandidatesLoading || isAppsLoading,
  };
}
