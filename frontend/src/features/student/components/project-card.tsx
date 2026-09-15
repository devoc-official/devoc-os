'use client';

import React from 'react';
import Link from 'next/link';
import { FolderGit2, CheckCircle2, ListTodo, ArrowRight, Clock } from 'lucide-react';
import { StudentProjectWithDetails } from '../hooks/use-student-projects';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

interface ProjectCardProps {
  project: StudentProjectWithDetails;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const completedTasks = project.tasks.filter((t) => t.status === 'done').length;
  const totalTasks = project.tasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="rounded-lg border border-devoc-border bg-devoc-card p-4 transition-all hover:border-devoc-border-hover space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-devoc-border/50 pb-3">
        <div className="flex items-center gap-2">
          <FolderGit2 className="h-4 w-4 text-devoc-brand" />
          <h4 className="text-xs font-semibold text-devoc-text-primary">
            {project.name}
          </h4>
          <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
            {project.code}
          </Badge>
          <Badge variant="brand" size="sm" className="capitalize">
            {project.status}
          </Badge>
        </div>

        {project.roleContext && (
          <Badge variant="neutral" size="sm">
            Role: {project.roleContext}
          </Badge>
        )}
      </div>

      {project.description && (
        <p className="text-xs text-devoc-text-secondary leading-relaxed line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Tasks & Work Summary */}
      <div className="flex items-center justify-between border-t border-devoc-border/40 pt-2 text-xs">
        <div className="flex items-center gap-4 text-[11px] font-mono text-devoc-text-secondary">
          <span>{completedTasks}/{totalTasks} tasks done ({taskProgress}%)</span>
          <span>{project.workRecords.length} work logs</span>
        </div>

        <Link href={`/learning/projects/${project.id}`}>
          <Button variant="ghost" size="sm" className="text-xs h-7 text-devoc-text-secondary hover:text-devoc-text-primary">
            View Project
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
