'use client';

import React from 'react';
import { Award, CheckCircle2, GraduationCap, ShieldCheck } from 'lucide-react';
import { useStudentAchievements } from '../hooks/use-student-achievements';
import { AchievementBadge } from '../components/achievement-badge';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentAchievementsView() {
  const { achievements, isLoading } = useStudentAchievements();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Verified Achievements & Outcomes
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Authoritative certifications, completed milestones, and shipped project deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm">
            {achievements.length} Verified Records
          </Badge>
        </div>
      </div>

      {/* Philosophy note */}
      <div className="rounded-md border border-devoc-border/60 bg-devoc-bg/60 p-3.5 text-xs text-devoc-text-secondary flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-devoc-brand shrink-0" />
        <span>
          Achievements in DeVoc OS represent <strong>genuine academic and engineering milestones</strong> verified by reviewers and backed by append-only audit entries.
        </span>
      </div>

      {/* Achievements List */}
      {achievements.length === 0 ? (
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-12 text-center space-y-3">
          <Award className="mx-auto h-10 w-10 text-devoc-text-tertiary" />
          <h3 className="text-sm font-bold text-devoc-text-primary">No Verified Achievements Yet</h3>
          <p className="text-xs text-devoc-text-secondary max-w-sm mx-auto">
            Achievements will unlock automatically as you complete milestone deliverables, pass evaluations, and ship project features.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((ach) => (
            <AchievementBadge key={ach.id} achievement={ach} />
          ))}
        </div>
      )}
    </div>
  );
}
