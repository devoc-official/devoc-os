'use client';

import React from 'react';
import Link from 'next/link';
import { FolderGit2, ListTodo, Briefcase, Plus, ArrowRight } from 'lucide-react';
import { useStudentProjects } from '../hooks/use-student-projects';
import { ProjectCard } from '../components/project-card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentProjectsView() {
  const { projects, isLoading } = useStudentProjects();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
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
            My Projects & Tasks
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Real production projects, student assignments, and task deliverables integrated with your curriculum.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="brand" size="sm">
            {projects.length} Assigned Projects
          </Badge>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-12 text-center space-y-3">
          <FolderGit2 className="mx-auto h-10 w-10 text-devoc-text-tertiary" />
          <h3 className="text-sm font-bold text-devoc-text-primary">No Projects Assigned Yet</h3>
          <p className="text-xs text-devoc-text-secondary max-w-sm mx-auto">
            Practical projects and team assignments will appear here once assigned by your Project Manager or Academy Lead.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
