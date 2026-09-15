'use client';

import React from 'react';
import { Award, CheckCircle2, GraduationCap, FolderGit2, Calendar } from 'lucide-react';
import { StudentAchievement } from '../types/student.types';
import { Badge } from '../../../components/ui/badge';

interface AchievementBadgeProps {
  achievement: StudentAchievement;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  milestone: CheckCircle2,
  assessment: Award,
  project: FolderGit2,
  program: GraduationCap,
};

export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const IconComponent = CATEGORY_ICONS[achievement.category] || Award;

  return (
    <div className="rounded-lg border border-devoc-border bg-devoc-card p-4 transition-all hover:border-devoc-border-hover space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-devoc-brand/20 bg-devoc-brand/10 text-devoc-brand">
            <IconComponent className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-devoc-text-primary leading-snug">
              {achievement.title}
            </h4>
            <Badge variant="neutral" size="sm" className="mt-1 capitalize">
              {achievement.category} Achievement
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-mono text-devoc-text-tertiary">
          <Calendar className="h-3 w-3" />
          <span>{new Date(achievement.achievedAt).toLocaleDateString()}</span>
        </div>
      </div>

      <p className="text-xs text-devoc-text-secondary leading-relaxed">
        {achievement.description}
      </p>

      {achievement.evidenceReference && (
        <div className="border-t border-devoc-border/40 pt-2 text-[10px] font-mono text-devoc-text-tertiary flex items-center justify-between">
          <span>Verification Code</span>
          <span className="text-devoc-text-secondary font-semibold">{achievement.evidenceReference}</span>
        </div>
      )}
    </div>
  );
}
