'use client';

import React from 'react';
import { Briefcase, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';
import { useMentorStudents } from '../hooks/use-mentor-students';

export function MentorAssignmentsView() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const { mentorPerson } = useMentorStudents();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['mentor', 'official-assignments', orgId, mentorPerson?.id],
    queryFn: async (): Promise<Assignment[]> => {
      if (!orgId || !mentorPerson) return [];
      try {
        return await assignmentsApi.getPersonAssignments(orgId, mentorPerson.id);
      } catch {
        return [];
      }
    },
    enabled: Boolean(orgId && mentorPerson),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-devoc-text-primary">
          Mentor Assignments & Capacity
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Official M3 Assignment Engine records detailing your mentorship capacity, assigned target scopes, and active responsibilities.
        </p>
      </div>

      <Card className="border-devoc-border bg-devoc-surface">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-devoc-brand" />
            Active Mentor Assignments
          </CardTitle>
          <CardDescription className="text-xs">
            Organizational assignments linking your person profile to students, programs, and Academy business units.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {assignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-devoc-surface-hover/50 text-[10px] uppercase font-mono tracking-wider text-devoc-text-tertiary border-y border-devoc-border">
                  <tr>
                    <th className="py-2.5 px-4">Assignment Type</th>
                    <th className="py-2.5 px-4">Role Context</th>
                    <th className="py-2.5 px-4">Target Type</th>
                    <th className="py-2.5 px-4">Capacity</th>
                    <th className="py-2.5 px-4">Start Date</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-devoc-border/60">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-devoc-surface-hover/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-devoc-text-primary capitalize">
                        {a.assignmentType}
                      </td>
                      <td className="py-3 px-4 text-devoc-text-secondary">
                        {a.roleContext || 'Mentor'}
                      </td>
                      <td className="py-3 px-4 uppercase font-mono text-[11px] text-devoc-text-tertiary">
                        {a.targetType}
                      </td>
                      <td className="py-3 px-4 font-mono text-devoc-text-primary">
                        {a.capacityValue ? `${a.capacityValue} ${a.capacityUnit || 'students'}` : 'Flexible'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-devoc-text-secondary">
                        {new Date(a.startAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={a.status === 'active' ? 'brand' : 'outline'}
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-devoc-text-tertiary space-y-2">
              <Briefcase className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs font-medium text-devoc-text-secondary">No direct M3 assignments logged.</p>
              <p className="text-[11px]">Mentorship assignments configured by Academy administration will be displayed here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
